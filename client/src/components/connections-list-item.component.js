import React, { Component } from 'react';
import PropTypes from 'prop-types';
import Icon from 'react-native-vector-icons/FontAwesome';
import {
  StyleSheet,
  Text,
  Image,
  View,
  TouchableHighlight,
} from 'react-native';

const styles = StyleSheet.create({
  cellContainer: {
    alignItems: 'center',
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  cellImage: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  cellLabel: {
    flex: 1,
    fontSize: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  checkButtonContainer: {
    paddingRight: 12,
    paddingVertical: 6,
  },
  checkButton: {
    borderWidth: 1,
    borderColor: '#dbdbdb',
    padding: 4,
    height: 24,
    width: 24,
  },
  checkButtonIcon: {
    marginRight: -4, // default is 12
  },
});

class ConnectionsListItem extends Component {
  constructor(props) {
    super(props);
    // this.toggle = this.toggle.bind(this);
    this.handleOnSelect = this.handleOnSelect.bind(this);
    // this.state = {
    //   isSelected: props.isSelected(props.item),
    // };
  }

  componentWillReceiveProps(nextProps) {
    // this.setState({
    //   isSelected: nextProps.isSelected(nextProps.item),
    // });
  }

  handleOnSelect() {
    if (this.props.item) {
      this.props.onSelect(this.props.item);
    }
  }

  // toggle() {
  //   if (this.props.toggle) {
  //     this.props.toggle(this.props.item);
  //   }
  // }

  render() {
    return (
      <View style={styles.cellContainer}>
        <TouchableHighlight onPress={this.handleOnSelect}>
          <Image
            style={styles.cellImage}
            source={{ uri: 'https://reactjs.org/logo-og.png' }}
          />
        </TouchableHighlight>
        <Text style={styles.cellLabel}>{this.props.item.username}</Text>
        <View style={styles.checkButtonContainer}>
          <Icon.Button
            backgroundColor={'white'}
            borderRadius={12}
            color={'white'}
            iconStyle={styles.checkButtonIcon}
            name={'check'}
            onPress={this.toggle}
            size={16}
            style={styles.checkButton}
          />
        </View>
      </View>
    );
  }
}

ConnectionsListItem.propTypes = {
  // used by username-search.screen
  onSelect: PropTypes.func,
  item: PropTypes.shape({
    username: PropTypes.string.isRequired,
  }).isRequired,
};

export default ConnectionsListItem;
