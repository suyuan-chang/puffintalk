import React from 'react';
import { BrowserRouter as Router, Route, Switch } from 'react-router-dom';
import HomeScreen from './components/HomeScreen';
import SigninScreen from './components/SigninScreen';
import ContactsScreen from './components/ContactsScreen';
import MessagesScreen from './components/MessagesScreen';

const App = () => {
  return (
    <Router>
      <Switch>
        <Route path="/signin">
          <SigninScreen method="signin" />
        </Route>
        <Route path="/signup">
          <SigninScreen method="signup" />
        </Route>
        <Route path="/contacts">
          <ContactsScreen />
        </Route>
        <Route path="/messages/:phoneNumber">
          <MessagesScreen />
        </Route>
        <Route path="/">
          <HomeScreen />
        </Route>
      </Switch>
    </Router>
  );
};

export default App;
