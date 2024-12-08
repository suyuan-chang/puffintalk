import React, { useEffect, useState, useRef } from 'react';
import { API_URL } from '../utils/api';
import { useHistory, useParams } from 'react-router-dom';
import PopupMenu from './PopupMenu';

import logoLeft from '../assets/PuffinTalk-a.png';
import logoRight from '../assets/PuffinTalk-b.png';
import '../styles/Screen.css';
import '../styles/MessagesScreen.css';

const MessagesScreen = () => {
  const { phoneNumber } = useParams();
  const [contact, setContact] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [showMenu, setShowMenu] = useState(false);
  const [selectedMessageId, setSelectedMessageId] = useState(null);
  const history = useHistory();
  const messagesEndRef = useRef(null);
  const ws = useRef(null);

  const fetchContact = async () => {
    const token = localStorage.getItem('auth_token');
    const response = await fetch(`${API_URL}/contacts/${phoneNumber}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (response.status === 401) {
      localStorage.removeItem('auth_token');
      history.replace('/');
      return;
    } else if (!response.ok) {
      console.error(`Error fetch contact: ${phoneNumber}`, response.statusText);
      history.replace('/contacts');
      return;
    }

    const data = await response.json();
    if (!data.contacts || data.contacts.length === 0) {
      console.error(`Contact not found: ${phoneNumber}`);
      history.replace('/contacts');
      return;
    }

    setContact(data.contacts[0]);
  };

  const fetchMessages = async () => {
    const token = localStorage.getItem('auth_token');
    const response = await fetch(`${API_URL}/messages/${phoneNumber}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (response.status === 401) {
      localStorage.removeItem('auth_token');
      history.replace('/');
      return;
    } else if (!response.ok) {
      console.error(`Error fetch messages for ${phoneNumber}:`, response.statusText);
      history.replace('/contacts');
      return;
    }

    const data = await response.json();

    // Mark all unseen text message for me to seen
    let unseenMessages = false;
    data.messages.forEach(message => {
      if (message.sender === contact.phone_number &&
          message.message_type === 'text' &&
          message.status !== 'seen') {
        message.status = 'seen';
        unseenMessages = true;
      }
    });

    if (unseenMessages) {
      const token = localStorage.getItem('auth_token');
      await fetch(`${API_URL}/messages/read_all_text`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ phone_number: phoneNumber }),
      });
    }

    setMessages(data.messages);
  };

  useEffect(() => {
    fetchContact();
    // NOTE: Do first fetch messages after contact is fetched.
  }, [phoneNumber, history]);

  useEffect(() => {
    if (contact) {
      fetchMessages();
    }
  }, [contact]);

  const scrollToBottom = () => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView(/*{ behavior: 'smooth' }*/);
    }
  };

  useEffect(() => {
    if (selectedMessageId === null) {
      scrollToBottom();
    }
  }, [messages]);

  // NOTE: Use back button to close popup menu.
  useEffect(() => {
    if (showMenu) {
      history.push(`/messages/${phoneNumber}#menu`);
    } else {
      if (history.location.pathname + history.location.hash === `/messages/${phoneNumber}#menu`) {
        history.goBack();
      }
    }
    const handlePopState = (event) => {
      if (showMenu) {
        setShowMenu(false);
        event.preventDefault();
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [showMenu]);

  useEffect(() => {
    // Initialize WebSocket connection
    const token = localStorage.getItem('auth_token');
    ws.current = new WebSocket(`${API_URL}/notifications?token=${token}`);

    ws.current.onopen = () => {
      console.log('WebSocket connection opened');
    };

    ws.current.onmessage = (event) => {
      console.log('WebSocket message:', event.data);
      const message = JSON.parse(event.data);
      if (message.event === 'messages_updated' && message.sender === phoneNumber) {
        console.log(`Notify messages updated for ${phoneNumber}`);
        if (contact) {
          fetchMessages();
        } else {
          fetchContact();
        }
      }
    };

    ws.current.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    ws.current.onclose = () => {
      console.log('WebSocket connection closed');
    };

    // Cleanup WebSocket connection on component unmount
    return () => {
      if (ws.current) {
        ws.current.close();
      }
    };
  }, []);

  const handleSendMessage = async () => {
    if (newMessage) {
      sendTextMessage(newMessage);
      setNewMessage('');
    }
  };

  const handleInputKeyPress = (event) => {
    if (event.key === 'Enter') {
      handleSendMessage();
    }
  };

  const handleMenu = () => {
    setShowMenu(true);
  };

  const handleBack = () => {
    history.goBack();
  };

  const handlePopupMenu = (item) => {
    setShowMenu(false);

    // wait popup menu to close
    setTimeout(() => {
      switch (item) {
        case 'Send text':
          // Scroll to messages buttom and focus on input.
          scrollToBottom();
          document.querySelector('.message-input input').focus();
          break;
        case 'Send audio':
          handleMediaUpload('audio');
          break;
        case 'Send video':
          handleMediaUpload('video');
          break;
        case 'Leave chat room':
          if (history.location.state && history.location.state.from === 'contacts') {
            history.goBack();
          } else {
            history.replace('/contacts');
          }
          break;
        case null:
          break;
        default:
          console.error('Unknown menu item:', item);
      }
    }, 100);
  };

  const handleMediaUpload = (mediaType) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = `${mediaType}/*`;
    input.capture = true;

    input.onchange = async (event) => {
      const file = event.target.files[0];
      if (!file) return;

      const formData = new FormData();
      formData.append('file', file);

      const token = localStorage.getItem('auth_token');
      const response = await fetch(`${API_URL}/messages/upload_media?media_type=${file.type}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });

      if (!response.ok) {
        console.error('Upload media error:', response.statusText);
        return;
      }

      const data = await response.json();
      const mediaContentId = data.id;
      const messageType = mediaType;
      await sendMediaMessage(mediaContentId, messageType);
    };

    input.click();
  };

  const sendTextMessage = async (text) => {
    const token = localStorage.getItem('auth_token');
    const response = await fetch(`${API_URL}/messages/send`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ phone_number: phoneNumber, message_type: 'text', message: text }),
    });

    if (response.status === 401) {
      localStorage.removeItem('auth_token');
      history.replace('/');
      return;
    } else if (!response.ok) {
      console.error('Send message error:', response.statusText);
      return;
    }

    const data = await response.json();
    setMessages([...data.messages, ...messages]);
    setSelectedMessageId(null);
  };

  const sendMediaMessage = async (mediaContentId, messageType) => {
    const token = localStorage.getItem('auth_token');
    const response = await fetch(`${API_URL}/messages/send`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ phone_number: phoneNumber, message_type: messageType, media_content_id: mediaContentId }),
    });

    if (response.status === 401) {
      localStorage.removeItem('auth_token');
      history.replace('/');
      return;
    } else if (!response.ok) {
      console.error('Send message error:', response.statusText);
      return;
    }

    const data = await response.json();
    setMessages([...data.messages, ...messages]);
    setSelectedMessageId(null);
  };

  const handleSelectMessage = (messageId) => {
    setSelectedMessageId(messageId);
  };

  const handleKeyDown = (event) => {
    if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
      event.preventDefault();
      const currentIndex = messages.findIndex((msg) => msg.id === selectedMessageId);
      let newIndex;
      if (currentIndex === -1) {
        newIndex = 0;
      } else {
        newIndex = event.key === 'ArrowUp' ? currentIndex + 1 : currentIndex - 1;
        if (newIndex < 0) newIndex = messages.length - 1;
        if (newIndex >= messages.length) newIndex = 0;
      }
      setSelectedMessageId(messages[newIndex].id);
      document.getElementById(`message-${messages[newIndex].id}`).scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    } else if (event.key === 'Enter' && selectedMessageId !== null) {
      const selectedMessage = messages.find((msg) => msg.id === selectedMessageId);
      if (selectedMessage && (selectedMessage.message_type === 'video' || selectedMessage.message_type === 'audio')) {
        handleMessagePlayToggle(selectedMessage);
      }
    } else if (event.key === 'Escape') {
      const selectedMessage = messages.find((msg) => msg.id === selectedMessageId);
      const videoElement = document.getElementById('video-player');
      if (videoElement) {
        videoElement.pause();
        document.body.removeChild(videoElement);
      }
      if (selectedMessage) {
        delete selectedMessage.playing;
        setMessages([...messages]);
      }
    }
  };

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [selectedMessageId, messages]);

  const handleMessagePlayEnd = (message) => {
    if (message.playing) {
      delete message.playing;
      setMessages([...messages]);
    }
  };

  const handleMessagePlayToggle = async (message) => {
    const token = localStorage.getItem('auth_token');
    const mediaUrl = `${API_URL}/messages/media/${message.media_content_id}?token=${token}`;
    let play_started = false;
    let play_stopped = false;

    if (message.message_type === 'video') {
      let videoElement = document.getElementById('video-player');
      if (videoElement) {
        videoElement.pause();
        document.body.removeChild(videoElement);
        play_stopped = true;
      } else {
        videoElement = document.createElement('video');
        videoElement.id = 'video-player';
        videoElement.src = mediaUrl;
        videoElement.controls = true;
        videoElement.className = 'video-player';
        document.body.appendChild(videoElement);
        videoElement.onended = () => {
          handleMessagePlayEnd(message);
          document.body.removeChild(videoElement);
        };

        videoElement.play();
        play_started = true;
      }
    } else if (message.message_type === 'audio') {
      let audioElement = document.getElementById('audio-player');
      if (audioElement) {
        if (audioElement.src === mediaUrl) {
          audioElement.pause();
          document.body.removeChild(audioElement);
          play_stopped = true;
        } else {
          audioElement.src = mediaUrl;
          audioElement.play();
          play_started = true;
        }
      } else {
        audioElement = document.createElement('audio');
        audioElement.id = 'audio-player';
        audioElement.src = mediaUrl;
        document.body.appendChild(audioElement);
        audioElement.onended = () => {
          handleMessagePlayEnd(message);
          document.body.removeChild(audioElement);
        };

        audioElement.play();
        play_started = true;
      }
    }

    let updateMessages = false;
    if (play_started && message.sender === contact.phone_number && message.status !== 'seen') {
      const token = localStorage.getItem('auth_token');
      await fetch(`${API_URL}/messages/read`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ message_id: message.id }),
      });
      message.status = 'seen';
      updateMessages = true;
    }

    if (play_started || play_stopped) {
      for (let msg of messages) {
        if (msg.id === message.id && play_started) {
          msg.playing = true;
        } else {
          delete msg.playing;
        }
      }
      updateMessages = true;
    }

    if (updateMessages) {
      setMessages([...messages]);
    }
  };

  const renderMessageContent = (message) => {
    const is_receiving = message.sender === contact.phone_number;
    const is_unseen = is_receiving && message.status !== 'seen';
    const is_playing = message.playing;
    if (message.message_type === 'text') {
      return <div className={`message-item ${message.sender === contact.phone_number ? 'left-text' : 'right-text'}`}>{message.message}</div>;
    } else if (message.message_type === 'video') {
      return (
        <div className={`message-item ${is_receiving ? 'left-text' : 'right-text'}`} onClick={() => handleMessagePlayToggle(message)}>
          <span>{is_playing ? 'Playing' : (is_unseen ? 'Unseen' : '')}</span>
          <span className="video-icon">🎥</span>
          <span>{message.duration} s </span>
        </div>
      );
    } else if (message.message_type === 'audio') {
      return (
        <div className={`message-item ${is_receiving ? 'left-text' : 'right-text'}`} onClick={() => handleMessagePlayToggle(message)}>
          <span>{is_playing ? 'Playing' : (is_unseen ? 'Unread' : '')}</span>
          <span className="audio-icon">🎵</span>
          <span>{message.duration} s </span>
        </div>
      );
    }
  };

  return (
    <div className="full_container">
      <div className="header">
        <img src={logoLeft} alt="Logo" className="header_logo" />
        <h2 className="header_title">{contact ? contact.display_name || contact.phone_number : ''}</h2>
        <img src={logoRight} alt="Logo" className="header_logo" />
      </div>
      <div className="main messages-main">
        <div className="messages-list">
          {messages.slice().reverse().map((message) => {
          const isSelected = message.id === selectedMessageId;
          return (
            <div
              id={`message-${message.id}`}
              className={`message-item ${message.sender === contact.phone_number ? 'left' : 'right'} ${isSelected ? 'selected' : ''}`}
              key={message.id}
              onClick={() => handleSelectMessage(message.id)}
            >
              <div className={`message-item ${message.sender === contact.phone_number ? 'left-mark' : 'right-mark'}`} />
              {renderMessageContent(message)}
            </div>
          );
          })}
          <div ref={messagesEndRef} />
        </div>
        <div className="message-input">
          <input
          type="text"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          onKeyDown={handleInputKeyPress}
          placeholder="Type a message"
          />
          <button onClick={handleSendMessage}>Send</button>
        </div>
      </div>
      <div className="footer">
      <button className="menu" onClick={handleMenu}>Menu</button>
      <button className="back" onClick={handleBack}>Menu</button>
      </div>
      {showMenu && (
      <PopupMenu
        items={['Send text', 'Send audio', 'Send video', 'Leave chat room']}
        onSelectItem={handlePopupMenu}
      />
      )}
    </div>
    );
};

export default MessagesScreen;
