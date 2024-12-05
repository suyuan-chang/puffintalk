# PuffinTalk UI/UX Design Document

## Overview
PuffinTalk is a social media application that allows users to share short audio messages. The design focuses on simplicity, ease of use, and accessibility.

## Color Scheme
- Primary Color: #1A73E8 (Blue)
- Secondary Color: #14171A (Dark Gray)
- Accent Color: #F28205 (Orange)
- Background Color: #FFFFFF (White)
- Text Color: #657786 (Gray)

## Typography
- Font Family: Arial, sans-serif
- Heading Font Size: 24px
- Body Font Size: 16px
- Button Font Size: 14px

## Screens
### Homescreen
The landing page when the user starts PuffinTalk.
- A PuffinTalk logo in the center top.
- An input box for the user's phone number.
- A sign-in button to start the sign-in flow.
- A sign-up button to register a new phone number.

If previous sign-in token (JWT token) still valid, it will move to contact list screen directly.

### Sign-in
When the user clicks the sign-in button on the homescreen, it will redirect to this page to finish the sign-in process.
- An input box to enter the passcode received via SMS message.
- A continue button to verify the passcode.

If the passcode is correct, it will move to the contact list screen.

The user can navigate back to the homescreen to cancel the sign-in process.

### Sign-up
When the user clicks the sign-up button on the homescreen, it will redirect to this page if the number is not registered.
- An input box to enter the passcode received via SMS message.
- A continue button to verify the passcode.

If the passcode is correct, a new user is created and PuffinTalk will move to the contact list screen.

The user can navigate back to the homescreen to cancel the sign-up process.

### Contact List
A list view shows contacts of the current signed-in user. List view items are ordered by the last touch timestamp. The first list view item is a special item `New Contact`. Highlighting and clicking on it will move to the add contact screen. The initial focus is on the first real contact if it exists. If this contact has a non-empty display name, use the display name; otherwise, use the phone number for the list item text.

- A list view for contacts
- A bottom bar includes a hamburger menu button on the left corner. Clicking on the hamburger menu will pop up a menu for advanced features including `Add contact`, `Block contact`, and `Edit contact`.

Blocking a contact will pop up a confirmation message box. Once confirmed, the current selected contact will be blocked and removed from the contact list.

Editing a contact will move to the Edit contact screen to change the contact display name.

### Add contact
When the user clicks `Add contact` in the Contact List screen, it will redirect to the add contact screen.

- An input box to enter the contact's phone number.
- An input box to enter an optional display name.
- An add button to confirm adding a contact (aka request friend).

The user can navigate back to the contact list screen to cancel the add contact process.

After pressing the add button, it will move back to the contact list.

### Edit contact
When the user clicks `Edit contact` in the Contact List screen, it will redirect to this screen.

- A text label for the contact's phone number.
- An input box to change the current display name.
- An update button to confirm changes.

The user can navigate back to the contact list screen to cancel the edit contact process.

After pressing the update button, it will move back to the contact list.

### Messages
When the user clicks a contact in the Contact List screen, it will redirect to the messages screen.

- A top bar shows the contact's phone number or display name.
- A list view displays the message history between the user and this contact.
- A bottom panel includes three buttons:
  - A button to send a text message.
  - A button to send an audio message.
  - A button to send a video message.

The list view will list message history by created time, with the latest message at the bottom. The initial focus is at the bottom as well.

The user can scroll the list view to see all messages.

The messages in the list view could be text, audio, or video. If it's a text message, show it as a multi-line text list view item. If it's an audio or video message, it will show a special icon to represent it.

When the user clicks on an audio message item, it will play it on the same screen. Clicking it again while it's playing will stop it immediately.

When the user clicks on a video message item, it will play it in fullscreen.

When the user presses the send text button, it will show a text input in the same screen for the user to enter text.

When the user presses the send audio/video button, it will let the user record audio/video. After recording ends, the user can confirm sending it out or cancel it.

## Accessibility
- Ensure all interactive elements are keyboard accessible.

## Responsive Design
PuffinTalk is designed for small screen devices.
- QQVGA: 128x160
- QVGA: 240x320
- Mobile: 480x640

For desktop: layout it as in the mobile screen. Keep content in the center.

## Conclusion
The PuffinTalk app aims to provide an intuitive instant messaging application for Cloud Phone and mobile devices.
