import React, { Component } from 'react';
import PropTypes from 'prop-types';
import {
  FlatList,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome';

const styles = StyleSheet.create({
  list: {
    paddingVertical: 8,
  },
  itemContainer: {
    alignItems: 'center',
    paddingHorizontal: 12,
  },
  itemIcon: {
    alignItems: 'center',
    backgroundColor: '#dbdbdb',
    borderColor: 'white',
    borderRadius: 10,
    borderWidth: 2,
    flexDirection: 'row',
    height: 20,
    justifyContent: 'center',
    position: 'absolute',
    right: -3,
    top: -3,
    width: 20,
  },
  itemImage: {
    borderRadius: 27,
    height: 54,
    width: 54,
  },
});

export class ConnectionsListItem extends Component {

  render() {
    const { username } = this.props.user;

    return (
      <View
        style={styles.itemContainer}
      >
        <View>
          <Image
            style={styles.itemImage}
            source={{ uri: 'https://reactjs.org/logo-og.png' }}
          />
          <TouchableOpacity style={styles.itemIcon}>
            <Icon
              color={'white'}
              name={'times'}
              size={12}
            />
          </TouchableOpacity>
        </View>
        <Text>{username}</Text>
      </View>
    );
  }
}
ConnectionsListItem.propTypes = {
  user: PropTypes.shape({
    id: PropTypes.number,
    username: PropTypes.string,
  }),
};

class ConnectionsList extends Component {
  constructor(props) {
    super(props);

    this.renderItem = this.renderItem.bind(this);
  }

  keyExtractor = item => item.id;



  render() {

    const renderItem = ({ item: user }) {
      return (
        <ConnectionsListItem user={user} />
      );
    };

    return (
      <FlatList
        data={this.props.data}
        keyExtractor={this.keyExtractor}
        renderItem={renderItem}
        horizontal
        style={styles.list}
      />
    );
  }
}
ConnectionsList.propTypes = {
  data: PropTypes.arrayOf(PropTypes.object),
};

export default ConnectionsList;
