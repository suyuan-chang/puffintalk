import React, { useEffect, useState, useRef } from 'react';
import { API_URL } from '../utils/api';
import { useHistory } from 'react-router-dom';
import ContactsList from './ContactsList';
import AddContact from './AddContact';
import EditContact from './EditContact';
import PopupMenu from './PopupMenu';
import PopupMessage from './PopupMessage';

import logoLeft from '../assets/PuffinTalk-a.png';
import logoRight from '../assets/PuffinTalk-b.png';
import '../styles/Screen.css';
import '../styles/ContactsScreen.css';

const ContactsScreen = () => {
  const [contacts, setContacts] = useState([]);
  const [highlightContact, setHighlightContact] = useState(null);
  const [contextMenuItems, setContextMenuItems] = useState([]);
  const [canEditContact, setCanEditContact] = useState(false);
  const [canAcceptContact, setCanAcceptContact] = useState(false);
  const [canDeleteContact, setCanDeleteContact] = useState(false);
  const [canMessageContact, setCanMessageContact] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [showMessage, setShowMessage] = useState(null);
  const [showAddContact, setShowAddContact] = useState(false);
  const [showEditContact, setShowEditContact] = useState(null);
  const history = useHistory();
  const ws = useRef(null);

  const fetchContacts = async () => {
    const token = localStorage.getItem('auth_token');
    const response = await fetch(`${API_URL}/contacts`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (response.status === 401) {
      localStorage.removeItem('auth_token');
      history.replace('/');
      return;
    } else if (!response.ok) {
      console.error('Error:', response.statusText);
      history.replace('/');
      return;
    }

    const data = await response.json();
    setContacts(data.contacts);

    if (data.contacts.length === 0) {
      setHighlightContact(null);
    }
  };

  useEffect(() => {
    fetchContacts();
  }, [history]);

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
      if (message.event === 'contacts_updated' || message.event === 'messages_updated') {
        fetchContacts();
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

  useEffect(() => {
    const canEdit = !!highlightContact;
    const canAccept = highlightContact && highlightContact.status === 'requested';
    const canDelete = highlightContact && highlightContact.status !== 'deleted';
    const canMessage = highlightContact && highlightContact.status === 'accepted';

    setCanEditContact(canEdit);
    setCanAcceptContact(canAccept);
    setCanDeleteContact(canDelete);
    setCanMessageContact(canMessage);

    const menuItems = ['Add contact'];
    if (canEdit) {
      menuItems.push('Edit contact');
    }
    if (canAccept) {
      menuItems.push('Accept contact');
    }
    if (canDelete) {
      menuItems.push('Delete contact');
    }
    if (canMessage) {
      menuItems.push('Message contact');
    }
    menuItems.push('Sign out');
    setContextMenuItems(menuItems);
  }, [highlightContact]);

  // NOTE: Use back button to close popup menu.
  useEffect(() => {
    if (showMenu) {
      history.push('/contacts#menu');
    } else {
      if (history.location.pathname + history.location.hash === '/contacts#menu') {
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

  // NOTE: Use back button to close popup message.
  useEffect(() => {
    if (showMessage) {
      history.push('/contacts#message');
    } else {
      if (history.location.pathname + history.location.hash === '/contacts#message') {
        history.goBack();
      }
    }
    const handlePopState = (event) => {
      if (showMessage) {
        setShowMessage(null);
        event.preventDefault();
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [showMessage]);

  // NOTE: Use back button to close add contact dialog.
  useEffect(() => {
    if (showAddContact) {
      history.push('/contacts#add');
    } else {
      if (history.location.pathname + history.location.hash === '/contacts#add') {
        history.goBack();
      }
    }
    const handlePopState = (event) => {
      if (showAddContact) {
        setShowAddContact(false);
        event.preventDefault();
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [showAddContact]);

  // NOTE: Use back button to close edit contact dialog.
  useEffect(() => {
    if (showEditContact) {
      history.push('/contacts#edit');
    } else {
      if (history.location.pathname + history.location.hash === '/contacts#edit') {
        history.goBack();
      }
    }
    const handlePopState = (event) => {
      if (showEditContact) {
        setShowEditContact(null);
        event.preventDefault();
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [showEditContact]);

  const handleMenu = () => {
    setShowMenu(true);
  };

  const handleBack = () => {
    history.goBack();
  };

  const handleHighlightContact = (index) => {
    const contact = index >=0 && index < contacts.length ? contacts[index] : null;
    if (contact === highlightContact) {
      // Avoid busy loop.
      return;
    }
    console.log('Highlight contact', contact);
    setHighlightContact(contact);
  };

  const handlePopupMenu = (item) => {
    setShowMenu(false);

    // NOTE: Ensure popup menu is closed first,
    // because action handlers may show other popup dialog.
    setTimeout(() => {
      switch (item) {
        case 'Add contact':
          handleAddContact();
          break;
        case 'Edit contact':
          handleEditContact();
          break;
        case 'Accept contact':
          handleAcceptContact();
          break;
        case 'Delete contact':
          handleDeleteContact();
          break;
        case 'Message contact':
          handleMessageContact();
          break;
        case 'Sign out':
          handleSignOut();
          break;
        case null:
          break;
        default:
          console.error('Unknown menu item:', item);
      }
    }, 100);
  };

  const handleAddContact = () => {
    console.log('Add contact');
    setShowAddContact(true);
  };

  const handleEditContact = () => {
    if (!canEditContact) {
      return;
    }
    console.log('Edit contact', highlightContact);
    setShowEditContact(highlightContact);
  };

  const handleAcceptContact = () => {
    if (!canAcceptContact) {
      return;
    }
    console.log('Accept contact', highlightContact);
    const token = localStorage.getItem('auth_token');
    const phone_number = highlightContact.phone_number;
    fetch(`${API_URL}/contacts/accept`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ phone_number }),
    })
    .then((response) => response.json())
    .then((data) => {
      console.log('Accept contact ok', data);
      fetchContacts();
    })
    .catch((error) => {
      console.error('Accept contact error', error);
    });
  };

  const handleDeleteContact = () => {
    if (!canDeleteContact) {
      return;
    }
    const message = `Delete contact ${highlightContact.display_name || highlightContact.phone_number} ?`;
    const deleteContact = () => {
      const token = localStorage.getItem('auth_token');
      const phone_number = highlightContact.phone_number;
      fetch(`${API_URL}/contacts/delete`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ phone_number }),
      })
      .then((response) => response.json())
      .then((data) => {
        console.log('Delete contact ok', data);
        fetchContacts();
      })
      .catch((error) => {
        console.error('Delete contact error', error);
      });
    };

    console.log('Confirm delete contact', highlightContact);

    setShowMessage({
      message: message,
      leftButton: 'Yes',
      rightButton: 'No',
      leftAction: () => {
        deleteContact();
        setShowMessage(null);
      },
      rightAction: () => {
        setShowMessage(null);
      }
    });
  };

  const handleMessageContact = () => {
    if (!canMessageContact) {
      return;
    }
    console.log('Message contact', highlightContact);
    history.push(`/messages/${highlightContact.phone_number}`, { from: 'contacts' });
  };

  const handleSignOut = () => {
    localStorage.removeItem('auth_token');
    history.replace('/');
  };

  if (showAddContact) {
    return <AddContact onClose={(result) => {
      setShowAddContact(false);
      if (result.success) {
        fetchContacts();
      } else {
        // NOTE: Workaround to show popup message after popup dialog is closed.
        setShowMessage({
          message: "Error: " + result.message
        });
      }
    }} />;
  }
  if (showEditContact) {
    return <EditContact
      phoneNumber={showEditContact.phone_number}
      displayName={showEditContact.display_name}
      onClose={(result) => {
        setShowEditContact(null);
        if (result.success) {
          fetchContacts();
        } else {
          setShowMessage({
            message: "Error: " + result.message
          });
        }
      }} />;
  }

  return (
    <div className="full_container">
      <div className="header">
        <img src={logoLeft} alt="Logo" className="header_logo" />
        <h2 className="header_title">PuffinTalk</h2>
        <img src={logoRight} alt="Logo" className="header_logo" />
      </div>
      <div className="main">
        {contacts.length === 0 ? (
          <div className="center_container">
            <button onClick={handleAddContact}>Add first contact</button>
          </div>
        ) : (
          <ContactsList contacts={contacts}
            disableKeyboardControl={showMenu || showMessage}
            onHighlightItem={handleHighlightContact}
            onSelectItem={handleMessageContact}/>
        )}
      </div>
      <div className="footer">
        <button className="menu" onClick={handleMenu}>Menu</button>
        <button className="back" onClick={handleBack}>Back</button>
      </div>
      {showMenu && (
        <PopupMenu items={contextMenuItems} onSelectItem={handlePopupMenu} />
      )}
      {showMessage && (
        <PopupMessage message={showMessage.message}
          leftButton={showMessage.leftButton}
          leftAction={showMessage.leftAction}
          rightButton={showMessage.rightButton}
          rightAction={showMessage.rightAction} />
      )}
    </div>
  );
};

export default ContactsScreen;
