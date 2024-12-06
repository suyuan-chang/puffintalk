import React, { useState } from 'react';
import { API_URL } from '../utils/api';
import '../styles/Screen.css';

const EditContact = ({ phoneNumber, displayName, onClose }) => {
  const [newDisplayName, setNewDisplayName] = useState(displayName);

  const handleEditContact = async () => {
    const token = localStorage.getItem('auth_token');
    fetch(`${API_URL}/contacts/update`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ phone_number: phoneNumber, display_name: newDisplayName }),
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
      <h1>Edit Contact</h1>
      <div>
        <div>
          <span>{phoneNumber}</span>
        </div>
        <hr></hr>
      </div>
      <div>
        <label>
          Display Name:
          <input
            type="text"
            value={newDisplayName}
            onChange={(e) => setNewDisplayName(e.target.value)}
          />
        </label>
      </div>
      <button onClick={handleEditContact}>Save</button>
    </div>
  );
};

export default EditContact;
