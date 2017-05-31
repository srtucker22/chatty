import { _ } from 'lodash';
import React, { Component } from 'react';
import PropTypes from 'prop-types';
import {
  ActivityIndicator,
  Button,
  Image,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { graphql, compose } from 'react-apollo';
import AlphabetListView from 'react-native-alpha-listview';
import update from 'immutability-helper';
import Icon from 'react-native-vector-icons/FontAwesome';

import SelectedUserList from '../components/selected-user-list.component';
import USER_QUERY from '../graphql/user.query';

// eslint-disable-next-line
const sortObject = o => Object.keys(o).sort().reduce((r, k) => (r[k] = o[k], r), {});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'white',
  },
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
  selected: {
    flexDirection: 'row',
  },
  loading: {
    justifyContent: 'center',
    flex: 1,
  },
  navIcon: {
    color: 'blue',
    fontSize: 18,
    paddingTop: 2,
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

const SectionHeader = ({ title }) => {
  // inline styles used for brevity, use a stylesheet when possible
  const textStyle = {
    textAlign: 'center',
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  };

  const viewStyle = {
    backgroundColor: '#ccc',
  };
  return (
    <View style={viewStyle}>
      <Text style={textStyle}>{title}</Text>
    </View>
  );
};
SectionHeader.propTypes = {
  title: PropTypes.string,
};

const SectionItem = ({ title }) => (
  <Text style={{ color: 'blue' }}>{title}</Text>
);
SectionItem.propTypes = {
  title: PropTypes.string,
};

class Cell extends Component {
  constructor(props) {
    super(props);
    this.toggle = this.toggle.bind(this);
    this.state = {
      isSelected: props.isSelected(props.item),
    };
  }

  componentWillReceiveProps(nextProps) {
    this.setState({
      isSelected: nextProps.isSelected(nextProps.item),
    });
  }

  toggle() {
    this.props.toggle(this.props.item);
  }

  render() {
    return (
      <View style={styles.cellContainer}>
        <Image
          style={styles.cellImage}
          source={{ uri: 'https://reactjs.org/logo-og.png' }}
        />
        <Text style={styles.cellLabel}>{this.props.item.username}</Text>
        <View style={styles.checkButtonContainer}>
          <Icon.Button
            backgroundColor={this.state.isSelected ? 'blue' : 'white'}
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
Cell.propTypes = {
  isSelected: PropTypes.func,
  item: PropTypes.shape({
    username: PropTypes.string.isRequired,
  }).isRequired,
  toggle: PropTypes.func.isRequired,
};

class NewGroup extends Component {
  static navigationOptions = ({ navigation }) => {
    const { state } = navigation;
    const isReady = state.params && state.params.mode === 'ready';
    return {
      title: 'New Group',
      headerRight: (
        isReady ? <Button
          title="Next"
          onPress={state.params.finalizeGroup}
        /> : undefined
      ),
    };
  };

  constructor(props) {
    super(props);

    let selected = [];
    if (this.props.navigation.state.params) {
      selected = this.props.navigation.state.params.selected;
    }

    this.state = {
      selected: selected || [],
      friends: props.user ?
        _.groupBy(props.user.friends, friend => friend.username.charAt(0).toUpperCase()) : [],
    };

    this.finalizeGroup = this.finalizeGroup.bind(this);
    this.isSelected = this.isSelected.bind(this);
    this.toggle = this.toggle.bind(this);
  }

  componentDidMount() {
    this.refreshNavigation(this.state.selected);
  }

  componentWillReceiveProps(nextProps) {
    const state = {};
    if (nextProps.user && nextProps.user.friends && nextProps.user !== this.props.user) {
      state.friends = sortObject(
        _.groupBy(nextProps.user.friends, friend => friend.username.charAt(0).toUpperCase()),
      );
    }

    if (nextProps.selected) {
      Object.assign(state, {
        selected: nextProps.selected,
      });
    }

    this.setState(state);
  }

  componentWillUpdate(nextProps, nextState) {
    if (!!this.state.selected.length !== !!nextState.selected.length) {
      this.refreshNavigation(nextState.selected);
    }
  }

  refreshNavigation(selected) {
    const { navigation } = this.props;
    navigation.setParams({
      mode: selected && selected.length ? 'ready' : undefined,
      finalizeGroup: this.finalizeGroup,
    });
  }

  finalizeGroup() {
    const { navigate } = this.props.navigation;
    navigate('FinalizeGroup', {
      selected: this.state.selected,
      friendCount: this.props.user.friends.length,
      userId: this.props.user.id,
    });
  }

  isSelected(user) {
    return ~this.state.selected.indexOf(user);
  }

  toggle(user) {
    const index = this.state.selected.indexOf(user);
    if (~index) {
      const selected = update(this.state.selected, { $splice: [[index, 1]] });

      return this.setState({
        selected,
      });
    }

    const selected = [...this.state.selected, user];

    return this.setState({
      selected,
    });
  }

  render() {
    const { user, loading } = this.props;

    // render loading placeholder while we fetch messages
    if (loading || !user) {
      return (
        <View style={[styles.loading, styles.container]}>
          <ActivityIndicator />
        </View>
      );
    }

    return (
      <View style={styles.container}>
        {this.state.selected.length ? <View style={styles.selected}>
          <SelectedUserList
            data={this.state.selected}
            remove={this.toggle}
          />
        </View> : undefined}
        {_.keys(this.state.friends).length ? <AlphabetListView
          style={{ flex: 1 }}
          data={this.state.friends}
          cell={Cell}
          cellHeight={30}
          cellProps={{
            isSelected: this.isSelected,
            toggle: this.toggle,
          }}
          sectionListItem={SectionItem}
          sectionHeader={SectionHeader}
          sectionHeaderHeight={22.5}
        /> : undefined}
      </View>
    );
  }
}

NewGroup.propTypes = {
  loading: PropTypes.bool.isRequired,
  navigation: PropTypes.shape({
    navigate: PropTypes.func,
    setParams: PropTypes.func,
    state: PropTypes.shape({
      params: PropTypes.object,
    }),
  }),
  user: PropTypes.shape({
    id: PropTypes.number,
    friends: PropTypes.arrayOf(PropTypes.shape({
      id: PropTypes.number,
      username: PropTypes.string,
    })),
  }),
  selected: PropTypes.arrayOf(PropTypes.object),
};

const userQuery = graphql(USER_QUERY, {
  options: (ownProps) => ({ variables: { id: 1 } }), // fake for now
  props: ({ data: { loading, user } }) => ({
    loading, user,
  }),
});

export default compose(
  userQuery,
)(NewGroup);
