import React, { useState, useEffect } from 'react';
import { useHistory } from 'react-router-dom';
import { API_URL } from '../utils/api';
import PopupMessage from '../components/PopupMessage';

import logo from '../assets/logo.png';
import '../styles/Screen.css'; // Import the shared CSS file

const HomeScreen = () => {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const history = useHistory();

  useEffect(() => {
    if (localStorage.getItem('auth_token')) {
      history.replace('/contacts');
      return;
    }

    const storedPhoneNumber = localStorage.getItem('phone_number');
    if (storedPhoneNumber) {
      setPhoneNumber(storedPhoneNumber);
    }
  }, []);

  // NOTE: Use back button to close popup message.
  useEffect(() => {
    if (errorMessage) {
      history.push('/#message');
    } else {
      if (history.location.pathname + history.location.hash === '/#message') {
        history.goBack();
      }
    }
    const handlePopState = (event) => {
      if (errorMessage) {
        setErrorMessage('');
        event.preventDefault();
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [errorMessage]);

  const handleInputChange = (e) => {
    setPhoneNumber(e.target.value);
  };

  const handleSignIn = () => {
    fetch(`${API_URL}/auth/signin`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        phone_number: phoneNumber,
      }),
    })
      .then((response) => response.json())
      .then((data) => {
        if (data.success) {
          localStorage.setItem('phone_number', phoneNumber);
          history.push('/signin');
        } else {
          setErrorMessage(`Error: ${data.message}`);
        }
      })
      .catch((error) => {
        setErrorMessage('An error occurred. Please try again.');
        console.error('Error:', error);
      });
  };

  const handleSignUp = () => {
    fetch(`${API_URL}/auth/signup`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        phone_number: phoneNumber,
      }),
    })
      .then((response) => response.json())
      .then((data) => {
        if (data.success) {
          localStorage.setItem('phone_number', phoneNumber);
          history.push('/signup');
        } else {
          setErrorMessage(`Error: ${data.message}`);
        }
      })
      .catch((error) => {
        setErrorMessage('An error occurred. Please try again.');
        console.error('Error:', error);
      });
  };

  return (
    <div className="container">
      {errorMessage && <PopupMessage message={errorMessage} />}
      <img src={logo} alt="PuffinTalk Logo" className="logo" />
      <h1>Welcome to PuffinTalk</h1>
      <input
        type="text"
        placeholder="Phone number"
        value={phoneNumber}
        onChange={handleInputChange}
      />
      <button className="signin" onClick={handleSignIn}>Sign In</button>
      <button className="signup" onClick={handleSignUp}>Sign Up</button>
    </div>
  );
};

export default HomeScreen;
