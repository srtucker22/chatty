import PropTypes from 'prop-types';
import React, { Component } from 'react';
import { NavigationActions, addNavigationHelpers, StackNavigator, TabNavigator } from 'react-navigation';
import {
  createReduxBoundAddListener,
  createReactNavigationReduxMiddleware,
} from 'react-navigation-redux-helpers';
import { Text, View, StyleSheet } from 'react-native';
import { connect } from 'react-redux';

import Groups from './screens/groups.screen';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'white',
  },
  tabText: {
    color: '#777',
    fontSize: 10,
    justifyContent: 'center',
  },
  selected: {
    color: 'blue',
  },
});

const TestScreen = title => () => (
  <View style={styles.container}>
    <Text>
      {title}
    </Text>
  </View>
);

// tabs in main screen
const MainScreenNavigator = TabNavigator({
  Chats: { screen: Groups },
  Settings: { screen: TestScreen('Settings') },
}, {
  initialRouteName: 'Chats',
});

const AppNavigator = StackNavigator({
  Main: { screen: MainScreenNavigator },
});

// reducer initialization code
const initialState=AppNavigator.router.getStateForAction(NavigationActions.reset({
	index: 0,
	actions: [
	  NavigationActions.navigate({
		  routeName: 'Main',
	  }),
	],
}));

export const navigationReducer = (state = initialState, action) => {
  const nextState = AppNavigator.router.getStateForAction(action, state);

  // Simply return the original `state` if `nextState` is null or undefined.
  return nextState || state;
};

// Note: createReactNavigationReduxMiddleware must be run before createReduxBoundAddListener
export const navigationMiddleware = createReactNavigationReduxMiddleware(
  "root",
  state => state.nav,
);
const addListener = createReduxBoundAddListener("root");

class AppWithNavigationState extends Component {
  render() {
    return (
      <AppNavigator navigation={addNavigationHelpers({
        dispatch: this.props.dispatch,
        state: this.props.nav,
        addListener,
      })} />
    );
  }
}

const mapStateToProps = state => ({
  nav: state.nav,
});

export default connect(mapStateToProps)(AppWithNavigationState);
