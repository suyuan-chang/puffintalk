import React, { useEffect, useState, useRef } from 'react';
import { API_URL } from '../utils/api';
import { useHistory, useParams } from 'react-router-dom';
import PopupMenu from './PopupMenu';

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
    setMessages(data.messages);
  };

  useEffect(() => {
    fetchContact();
    fetchMessages();
  }, [phoneNumber, history]);

  const scrollToBottom = () => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView(/*{ behavior: 'smooth' }*/);
    }
  };

  useEffect(() => {
    scrollToBottom();
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

  const handleSendMessage = async () => {
    const token = localStorage.getItem('auth_token');
    const response = await fetch(`${API_URL}/messages/send`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ phone_number: phoneNumber, message_type: 'text', message: newMessage }),
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
    setNewMessage('');
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
          // TODO: Implement send audio functionality
          break;
        case 'Send video':
          // TODO: Implement send video functionality
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
    }
  };

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [selectedMessageId, messages]);

  return (
    <div className="full_container">
      <div className="header">
      <h2 className="header_title">{contact ? contact.display_name || contact.phone_number : ''}</h2>
      </div>
      <div className="main">
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
            <div className={`message-item ${message.sender === contact.phone_number ? 'left-text' : 'right-text'}`}>
              {message.message}
            </div>
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
