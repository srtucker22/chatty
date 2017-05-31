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

export class SelectedUserListItem extends Component {
  constructor(props) {
    super(props);

    this.remove = this.remove.bind(this);
  }

  remove() {
    this.props.remove(this.props.user);
  }

  render() {
    const { username } = this.props.user;

    return (
      <View
        style={styles.itemContainer}
      >
        <View>
          <Image
            style={styles.itemImage}
            source={{ uri: 'https://facebook.github.io/react/img/logo_og.png' }}
          />
          <TouchableOpacity onPress={this.remove} style={styles.itemIcon}>
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
SelectedUserListItem.propTypes = {
  user: PropTypes.shape({
    id: PropTypes.number,
    username: PropTypes.string,
  }),
  remove: PropTypes.func,
};

class SelectedUserList extends Component {
  constructor(props) {
    super(props);

    this.renderItem = this.renderItem.bind(this);
  }

  keyExtractor = item => item.id;

  renderItem({ item: user }) {
    return (
      <SelectedUserListItem user={user} remove={this.props.remove} />
    );
  }

  render() {
    return (
      <FlatList
        data={this.props.data}
        keyExtractor={this.keyExtractor}
        renderItem={this.renderItem}
        horizontal
        style={styles.list}
      />
    );
  }
}
SelectedUserList.propTypes = {
  data: PropTypes.arrayOf(PropTypes.object),
  remove: PropTypes.func,
};

export default SelectedUserList;
