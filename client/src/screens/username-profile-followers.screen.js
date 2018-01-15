import { _ } from 'lodash';
import React, { Component } from 'react';
import PropTypes from 'prop-types';
import {
  Button,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import AlphabetListView from 'react-native-alphabetlistview';

// import ConnectionsList from '../components/connections-list.component';
import ConnectionsListItem from '../components/connections-list-item.component';
import { sortObject } from '../utils/formatters';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'white',
  },
  detailsContainer: {
    padding: 20,
    flexDirection: 'row',
  },
  imageContainer: {
    paddingRight: 20,
    alignItems: 'center',
  },
  inputContainer: {
    flexDirection: 'column',
    flex: 1,
  },
  input: {
    color: 'black',
    height: 48,
  },
  inputBorder: {
    borderColor: '#dbdbdb',
    borderBottomWidth: 1,
    borderTopWidth: 1,
    paddingVertical: 8,
  },
  inputInstructions: {
    paddingTop: 6,
    color: '#777',
    fontSize: 12,
  },
  groupImage: {
    width: 54,
    height: 54,
    borderRadius: 27,
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
  participants: {
    paddingHorizontal: 20,
    paddingVertical: 6,
    backgroundColor: '#dbdbdb',
    color: '#777',
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

class UsernameProfileFollowers extends Component {
  static navigationOptions = ({ navigation }) => {
    const { state } = navigation;
    const usernameUsername = (
      state.params
      && state.params.username
      && state.params.username.username
    )
      ? state.params.username.username
      : '';
    return {
      title: `${usernameUsername}'s Followers`,
    };
  };

  constructor(props) {
    super(props);
    this.state = {
      usernameUsername: (
        props.navigation.state.params
        && props.navigation.state.params.username
        && props.navigation.state.params.username.username
      )
        ? props.navigation.state.params.username.username
        : '',
      resultsLength: (
        props.navigation.state.params
        && props.navigation.state.params.username
        && props.navigation.state.params.username.followers
      ) ?
        props.navigation.state.params.username.followers.length : 0,
      // TODO rename users prop to usernames for clarity
      users: (
        props.navigation.state.params
        && props.navigation.state.params.username
        && props.navigation.state.params.username.followers
      ) ? _.groupBy(
          props.navigation.state.params.username.followers,
          user => user.username.charAt(0).toUpperCase()
        )
        : [],
    };

    this.pop = this.pop.bind(this);
    this.handleCellSelect = this.handleCellSelect.bind(this);
  }

  componentDidMount() {
    console.log('componentDidMount', this);
    this.refreshNavigation();
  }

  componentWillReceiveProps(nextProps) {
    const state = {};
    const currentUsers = (
      this.props.navigation.state.params
      && this.props.navigation.state.params.username
      && this.props.navigation.state.params.username.followers
    ) ? this.props.navigation.state.params.username.followers : [];
    const nextUsers = (
      nextProps.navigation.state.params
      && nextProps.navigation.state.params.username
      && nextProps.navigation.state.params.username.followers
    ) ? nextProps.navigation.state.params.username.followers : [];

    if (nextUsers && nextUsers !== currentUsers) {
      state.resultsLength = nextUsers.length;
      state.users = sortObject(
        _.groupBy(nextUsers, user => user.username.charAt(0).toUpperCase()),
      );
    }
    this.setState(state);
  }

  pop() {
    this.props.navigation.goBack();
  }

  refreshNavigation(nextProps) {
    const newestProps = (nextProps) ? nextProps : this.props;

    const username = (
      newestProps.navigation.state.params
      && newestProps.navigation.state.params.username
    ) ? newestProps.navigation.state.params.username
      : '';

    newestProps.navigation.setParams({
      username,
    });
  }

  handleCellSelect(cell) {
    const { navigate, user } = this.props.navigation;
    navigate('UsernameProfile', {
      selectedUser: cell,
      userId: user.id,
    });
  }

  render() {
    const users = this.state.users;
    const resultsLength = this.state.resultsLength;

    return (
      <View style={styles.container}>
        <View style={styles.selected}>
          {_.keys(users).length ? <AlphabetListView
            style={{ flex: 1 }}
            data={users}
            cell={ConnectionsListItem}
            cellHeight={30}
            onCellSelect={this.handleCellSelect}
            sectionListItem={SectionItem}
            sectionHeader={SectionHeader}
            sectionHeaderHeight={22.5}
          /> : undefined}
        </View>
      </View>
    );
  }
}

UsernameProfileFollowers.propTypes = {
  navigation: PropTypes.shape({
    dispatch: PropTypes.func,
    goBack: PropTypes.func,
    navigate: PropTypes.func,
    setParams: PropTypes.func,
    state: PropTypes.shape({
      params: PropTypes.shape({
        username: PropTypes.object,
      }),
    }),
    user: PropTypes.shape({
      id: PropTypes.number,
    }),
  }),
};


export default UsernameProfileFollowers;
