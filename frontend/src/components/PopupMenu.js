import React, { useState, useEffect, useRef } from 'react';
import '../styles/PopupMenu.css'; // Import the CSS file

const PopupMenu = ({ items, onSelectItem }) => {
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const menuRef = useRef(null);

  useEffect(() => {
    const handleKeyDown = (event) => {
      switch (event.key) {
        case 'ArrowDown':
          setHighlightedIndex((prevIndex) => (prevIndex + 1) % items.length);
          break;
        case 'ArrowUp':
          setHighlightedIndex((prevIndex) => (prevIndex - 1 + items.length) % items.length);
          break;
        case 'Enter':
          onSelectItem(items[highlightedIndex]);
          break;
        default:
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [highlightedIndex, items, onSelectItem]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        onSelectItem(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [onSelectItem]);

  return (
    <div className="popup-menu-overlay">
      <div ref={menuRef} className="popup-menu">
        <ul>
          {items.map((item, index) => (
            <li
              key={index}
              className={highlightedIndex === index ? 'highlighted' : ''}
              onClick={() => onSelectItem(item)}
            >
              {item}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default PopupMenu;
