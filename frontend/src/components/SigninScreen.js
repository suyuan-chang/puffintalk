import React, { useState, useEffect } from 'react';
import { API_URL } from '../utils/api';
import { useHistory } from 'react-router-dom';
import PopupMessage from '../components/PopupMessage';

import logo from '../assets/logo.png';
import '../styles/Screen.css'; // Import the shared CSS file

const SigninScreen = ({ method }) => {
  const [passcode, setPasscode] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const history = useHistory();

  // NOTE: Use back button to close popup message.
  useEffect(() => {
    if (errorMessage) {
      history.push(`/${method}#message`);
    } else {
      if (history.location.pathname + history.location.hash === `/${method}#message`) {
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
    setPasscode(e.target.value);
  };

  const handleSignIn = () => {
    // Get phone number from localStorage
    const phoneNumber = localStorage.getItem('phone_number');

    // NOTE: method must be `signin` or `signup`
    fetch(`${API_URL}/auth/complete-${method}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        phone_number: phoneNumber,
        passcode: passcode,
      }),
    })
      .then((response) => response.json())
      .then((data) => {
        if (data.success) {
          localStorage.setItem('auth_token', data.token);
          // NOTE: Use history.goBack() to pop the current route from the history stack
          // Homescreen will auto navigate to ContactsScreen because we have set auth_token to local storage.
          history.goBack();
        } else {
          setPasscode('');
          setErrorMessage(`Error: ${data.message}`);
        }
      })
      .catch((error) => {
        console.error('Error:', error);
        setPasscode('');
        setErrorMessage('An error occurred. Please try again.');
      });
  };

  return (
    <div className="container">
      {errorMessage && <PopupMessage message={errorMessage} />}
      <img src={logo} alt="PuffinTalk Logo" className="logo" />
      <h1>Enter Passcode</h1>
      <input
        type="text"
        placeholder="Enter your passcode"
        value={passcode}
        onChange={handleInputChange}
      />
      <button onClick={handleSignIn} className={`${method}`} >
        {method === 'signin' ? 'Sign In' : 'Sign Up'}
      </button>
    </div>
  );
};

export default SigninScreen;
