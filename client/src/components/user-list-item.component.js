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
import { colors } from '../utils/constants';

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
    backgroundColor: colors.PRIMARY,
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

const MainActionComponent = ({ type }) => {
  const availableTypes = ['write'];
  if (type === availableTypes[0]) {
    return (
      <Icon color={colors.PRIMARY} size={20} name="pencil" />
    );
  }
  return undefined;
};
MainActionComponent.propTypes = {
  type: PropTypes.string,
};

class UserListItem extends Component {
  constructor(props) {
    super(props);
    this.toggle = this.toggle.bind(this);
    this.handleOnSelect = this.handleOnSelect.bind(this);
    this.handleOnThumbnailActionSelect = this.handleOnThumbnailActionSelect.bind(this);
    this.handleOnMainActionSelect = this.handleOnMainActionSelect.bind(this);
    this.state = {
      isSelected: (props.isSelected) ? props.isSelected(props.item) : false,
    };
  }

  componentWillReceiveProps(nextProps) {
    this.setState({
      isSelected: (nextProps.isSelected) ? nextProps.isSelected(nextProps.item) : false,
    });
  }

  handleOnSelect() {
    if (this.props.item) {
      this.props.onSelect(this.props.item);
    }
  }

  handleOnMainActionSelect() {
    if (this.props.onMainActionSelect) {
      this.props.onMainActionSelect(this.props.item);
    }
  }

  handleOnThumbnailActionSelect() {
    if (this.props.onThumbnailActionSelect) {
      this.props.onThumbnailActionSelect(this.props.item);
    }
  }

  toggle() {
    if (this.props.toggle) {
      this.props.toggle(this.props.item);
    }
  }

  render() {
    return (
      <View style={styles.cellContainer}>
        {(this.props.onThumbnailActionSelect) ?
          <TouchableHighlight onPress={this.handleOnThumbnailActionSelect}>
            <Image
              style={styles.cellImage}
              source={{ uri: 'https://reactjs.org/logo-og.png' }}
            />
          </TouchableHighlight> : undefined
        }
        {(this.props.onSelect && !this.props.onThumbnailActionSelect) ?
          <TouchableHighlight onPress={this.handleOnSelect}>
            <Image
              style={styles.cellImage}
              source={{ uri: 'https://reactjs.org/logo-og.png' }}
            />
          </TouchableHighlight> : undefined
        }
        <Text style={styles.cellLabel}>{this.props.item.username}</Text>
        {(this.props.onMainActionSelect && this.props.mainActionType) ?
          <TouchableHighlight onPress={this.handleOnMainActionSelect}>
            <View style={styles.cellImage}>
              <MainActionComponent type={this.props.mainActionType} />
            </View>
          </TouchableHighlight> : undefined
        }
      </View>
    );
  }
}

UserListItem.propTypes = {
  // used by username-search.screen
  onSelect: PropTypes.func,
  // used by new-group.screen
  isSelected: PropTypes.func,
  item: PropTypes.shape({
    username: PropTypes.string.isRequired,
  }).isRequired,
  // used by new-group.screen
  toggle: PropTypes.func,
  // used by new-conversation.screen
  onMainActionSelect: PropTypes.func,
  onThumbnailActionSelect: PropTypes.func,
  mainActionType: PropTypes.oneOf(['write']),
};

export default UserListItem;
