import { _ } from 'lodash';
import {
  FlatList,
  StyleSheet,
  View,
} from 'react-native';
import PropTypes from 'prop-types';
import React, { Component } from 'react';
import randomColor from 'randomcolor';

import Message from '../components/message.component';

const styles = StyleSheet.create({
  container: {
    alignItems: 'stretch',
    backgroundColor: '#e5ddd5',
    flex: 1,
    flexDirection: 'column',
  },
});

const fakeData = () => _.times(100, i => ({
  // every message will have a different color
  color: randomColor(),
  // every 5th message will look like it's from the current user
  isCurrentUser: i % 5 === 0,
  message: {
    id: i,
    createdAt: new Date().toISOString(),
    from: {
      username: `Username ${i}`,
    },
    text: `Message ${i}`,
  },
}));

class Messages extends Component {
  static navigationOptions = ({ navigation }) => {
    const { state } = navigation;
    return {
      title: state.params.title,
    };
  };

  keyExtractor = item => item.message.id;

  renderItem = ({ item: { isCurrentUser, message, color } }) => (
    <Message
      color={color}
      isCurrentUser={isCurrentUser}
      message={message}
    />
  )

  render() {
    // render list of messages for group
    return (
      <View style={styles.container}>
        <FlatList
          data={fakeData()}
          keyExtractor={this.keyExtractor}
          renderItem={this.renderItem}
          ListEmptyComponent={<View />}
        />
      </View>
    );
  }
}

export default Messages;
