import { _ } from 'lodash';
import React, { Component } from 'react';
import PropTypes from 'prop-types';
import {
  ActivityIndicator,
  Button,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { graphql, compose } from 'react-apollo';
import AlphabetListView from 'react-native-alphabetlistview';
import update from 'immutability-helper';
import { connect } from 'react-redux';

import SelectedUserList from '../components/selected-user-list.component';
import UserListItem from '../components/user-list-item.component';
import USER_QUERY from '../graphql/user.query';
import sortObject from '../utils/formatters';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'white',
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

class NewGroup extends Component {
  static navigationOptions = ({ navigation }) => {
    const { state } = navigation;
    const isReady = state.params && state.params.mode === 'ready';
    return {
      title: 'New Conversation',
      headerRight: (
        isReady ? <View><Button
          title="Search by Username"
          onPress={state.params.toggleUsernameSearch}
        /><Button
          title="Next"
          onPress={state.params.finalizeGroup}
        /></View> : undefined
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
    console.log('componentWillUpdate', nextProps, nextState);
    if (!!this.state.selected.length !== !!nextState.selected.length) {
      this.refreshNavigation(nextState.selected);
    }
  }

  refreshNavigation({ selected }) {
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
    console.log('friends', this.state.friends);
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
          cell={UserListItem}
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
  options: ownProps => ({ variables: { id: ownProps.auth.id } }),
  props: ({ data: { loading, user } }) => ({
    loading, user,
  }),
});

const mapStateToProps = ({ auth }) => ({
  auth,
});

export default compose(
  connect(mapStateToProps),
  userQuery,
)(NewGroup);
