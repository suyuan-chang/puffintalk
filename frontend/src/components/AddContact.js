import React, { useState } from 'react';
import { API_URL } from '../utils/api';
import '../styles/Screen.css';

const AddContact = ({ onClose }) => {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [displayName, setDisplayName] = useState('');

  const handleAddContact = async () => {
    const token = localStorage.getItem('auth_token');
    fetch(`${API_URL}/contacts/request`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ phone_number: phoneNumber, display_name: displayName }),
    })
    .then((response) => response.json())
    .then((data) => {
      onClose(data);
    })
    .catch((error) => {
      onClose({success: false, message:'An error occurred. Please try again.'});
    });
  };

  return (
    <div className="container contact_edit_dialog">
      <h1>Add New Contact</h1>
      <div>
        <label>
          Phone Number:
          <input
            type="text"
            value={phoneNumber}
            onChange={(e) => setPhoneNumber(e.target.value)}
          />
        </label>
      </div>
      <div>
        <label>
          Display Name:
          <input
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
          />
        </label>
      </div>
      <button onClick={handleAddContact}>Add</button>
    </div>
  );
};

export default AddContact;
