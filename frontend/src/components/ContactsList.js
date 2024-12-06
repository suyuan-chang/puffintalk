import React, { useEffect, useState, useRef } from 'react';
import '../styles/ContactsList.css';

const ContactsList = ({ contacts, disableKeyboardControl, onHighlightItem, onSelectItem }) => {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const itemRefs = useRef([]);

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (!disableKeyboardControl) {
        if (event.key === 'ArrowDown') {
          setSelectedIndex((prevIndex) => (prevIndex + 1) % contacts.length);
        } else if (event.key === 'ArrowUp') {
          setSelectedIndex((prevIndex) => (prevIndex - 1 + contacts.length) % contacts.length);
        } else if (event.key === 'Enter') {
          if (onSelectItem) {
            onSelectItem(selectedIndex);
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [contacts.length, disableKeyboardControl, onSelectItem, selectedIndex]);

  useEffect(() => {
    if (onHighlightItem) {
      onHighlightItem(selectedIndex);
    }
    if (itemRefs.current[selectedIndex]) {
      itemRefs.current[selectedIndex].scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [selectedIndex, onHighlightItem]);

  return (
    <div className='contact_list'>
      <ul>
        {contacts
          .filter(contact => contact.status !== 'deleted')
          .map((contact, index) => (
            <li
              key={contact.phone_number}
              ref={el => itemRefs.current[index] = el}
              className={index === selectedIndex ? 'selected' : ''}
              onClick={() => {
                if (index === selectedIndex && onSelectItem) {
                  onSelectItem(index);
                }
                setSelectedIndex(index);
              }}
            >
              <div className={`contact_name status_${contact.status}`}>
                {contact.display_name || contact.phone_number}
              </div>
              <div className={`contact_status status_${contact.status}`}>
                {contact.status !== 'accepted' ? contact.status : ''}
              </div>
            </li>
          ))}
      </ul>
    </div>
  );
};

export default ContactsList;
