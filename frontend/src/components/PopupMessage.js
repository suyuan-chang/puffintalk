import React from 'react';

import '../styles/PopupMessage.css';

const PopupMessage = ({ message, leftButton, leftAction, rightButton, rightAction }) => {
  return (
    <div className="popup-overlay">
      <div className="popup-message">
        <p>{message}</p>
        <div className="popup-buttons">
          {leftButton && <button onClick={leftAction}>{leftButton}</button>}
          {rightButton && <button onClick={rightAction}>{rightButton}</button>}
        </div>
      </div>
    </div>
  );
};

export default PopupMessage;
