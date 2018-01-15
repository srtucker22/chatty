import { _ } from 'lodash';
import PropTypes from 'prop-types';
import React, { Component } from 'react';
import styled from 'styled-components/native';
import { connect } from 'react-redux';
import { graphql, compose } from 'react-apollo';
import {
  FlatList,
} from 'react-native';

import ProfileHeader from '../components/profile-header.component';
import FeedCard from '../components/feedcard/feedcard.component';

import { USER_QUERY } from '../graphql/user.query';
import { USERNAME_QUERY } from '../graphql/username.query';
import { UPDATE_FOLLOWED_MUTATION } from '../graphql/update-followed.mutation';


const Root = styled.View`
  flex: 1;
  backgroundColor: #f1f6fa;
`;

class UsernameProfile extends Component {
  static navigationOptions = {
    title: 'Username Profile',
  };

  constructor(props) {
    super(props);
    this.onRefresh = this.onRefresh.bind(this);
    this.handleNavToUsernameFollowers = this.handleNavToUsernameFollowers.bind(this);
    this.handleNavToUsernameFolloweds = this.handleNavToUsernameFolloweds.bind(this);
  }

  onRefresh() {
    this.props.refetch();
    // faking unauthorized status
  }

  keyExtractor = item => item.id;

  handleNavToUsernameFollowers() {
    const { navigate } = this.props.navigation;
    navigate('UsernameProfileFollowers', {
      username: this.props.username,
      userId: this.props.user.id,
    });
  }

  handleNavToUsernameFolloweds() {
    const { navigate } = this.props.navigation;
    navigate('UsernameProfileFolloweds', {
      username: this.props.username,
      userId: this.props.user.id,
    });
  }

  renderItem = ({ item }) => <FeedCard {...item} />;

  renderPlaceholder = () => (
    <FeedCard
      placeholder
      isLoaded={this.props.loading}
    />
  )

  render() {
    const { loading, user, username, updateFollowed } = this.props;
    const selectedUser = this.props.navigation.state.params.selectedUser || null;
    // render loading placeholder while we fetch messages
    if (loading || !username || !user) {
      return (
        <FlatList
          data={[1, 2, 3]}
          renderItem={this.renderPlaceholder}
          keyExtractor={item => item}
          contentContainerStyle={{ alignSelf: 'stretch' }}
        />
      );
    }
    const userIsFollowingUsername = _.some(user.followeds, { id: selectedUser.id });
    const usernameIsFollowing = true; // TODO show 'follows you' 
    return (
      <Root>
        <ProfileHeader
          {...username}
          userIsFollowingUsername={userIsFollowingUsername}
          updateFollowed={() => updateFollowed(userIsFollowingUsername)}
          navToUsernameFollowers={this.handleNavToUsernameFollowers}
          navToUsernameFolloweds={this.handleNavToUsernameFolloweds}
        />
        {userIsFollowingUsername ? <FlatList
          data={username.tweets}
          renderItem={this.renderItem}
          keyExtractor={this.keyExtractor}
          contentContainerStyle={{ alignSelf: 'stretch' }}
        /> : undefined}
      </Root>
    );
  }
}
UsernameProfile.propTypes = {
  navigation: PropTypes.shape({
    navigate: PropTypes.func,
    state: PropTypes.shape({
      params: PropTypes.shape({
        selectedUser: PropTypes.object,
        userId: PropTypes.number,
      }),
    }),
  }),
  loading: PropTypes.bool,
  networkStatus: PropTypes.number,
  refetch: PropTypes.func,
  updateFollowed: PropTypes.func,
  user: PropTypes.shape({
    id: PropTypes.number.isRequired,
    email: PropTypes.string.isRequired,
    firstName: PropTypes.string.isRequired,
    lastName: PropTypes.string.isRequired,
    avatar: PropTypes.string,
    groups: PropTypes.arrayOf(
      PropTypes.shape({
        id: PropTypes.number.isRequired,
        name: PropTypes.string.isRequired,
      }),
    ),
  }),
  username: PropTypes.shape({
    id: PropTypes.number.isRequired,
    username: PropTypes.string.isRequired,
    firstName: PropTypes.string.isRequired,
    lastName: PropTypes.string.isRequired,
    avatar: PropTypes.string.isRequired,
    followedsCount: PropTypes.number.isRequired,
    followersCount: PropTypes.number.isRequired,
  }),
};


const userQuery = graphql(USER_QUERY, {
  name: 'userData',
  skip: ownProps => !ownProps.auth || !ownProps.auth.jwt,
  options: ownProps => ({ variables: { id: ownProps.auth.id } }),
  props: ({ userData: { loading, networkStatus, refetch, user } }) => ({
    loading, networkStatus, refetch, user,
  }),
});

const usernameQuery = graphql(USERNAME_QUERY, {
  name: 'usernameData', // https://www.apollographql.com/docs/react/basics/queries.html#graphql-name
  skip: ownProps => !ownProps.auth || !ownProps.auth.jwt ||
    !ownProps.navigation || !ownProps.navigation.state ||
    !ownProps.navigation.state.params || !ownProps.navigation.state.params.selectedUser ||
    !ownProps.navigation.state.params.selectedUser.id,
  options: ownProps => ({ variables: { id: ownProps.auth.id, usernameId: ownProps.navigation.state.params.selectedUser.id } }), // eslint-disable-line max-len
  props: ({ usernameData: { loading, networkStatus, refetch, username } }) => ({
    loading, networkStatus, refetch, username,
  }),
});

const updateFollowedMutation = graphql(UPDATE_FOLLOWED_MUTATION, {
  skip: ownProps => !ownProps.auth || !ownProps.auth.jwt ||
    !ownProps.navigation || !ownProps.navigation.state ||
    !ownProps.navigation.state.params || !ownProps.navigation.state.params.selectedUser ||
    !ownProps.navigation.state.params.selectedUser.id,
  props: ({ ownProps, mutate }) => {
    const { user, state } = { ...ownProps.navigation };
    const username = state.params.selectedUser;
    const userIsFollowingUsername = _.some(user.followeds, { id: username.id });
    // update folllowers db table
    console.log('!!!!!! userIsFollowingUsername?', userIsFollowingUsername);
    return {
      updateFollowed: alreadyFollowin =>
        mutate({
          variables: {
            user: {
              userId: ownProps.auth.id,
              followedId: state.params.selectedUser.id,
            },
          },
          optimisticResponse: {
            __typename: 'Mutation',
            updateFollowed: {
              __typename: 'User',
              id: ownProps.auth.id,
              username: ownProps.auth.username,
              followeds: (alreadyFollowin)
                ? [] // user unfollows all for now 
                : [...user.followeds, { id: username.id, username: username.username, __typename: 'User' }], // don't need check for optimistic UI
              followedsCount: (alreadyFollowin)
                ? user.followedsCount - 1
                : user.followedsCount + 1,
            },
          },
          update: (store, { data: { updateFollowed } }) => {
            // Read the data from our cache for this query
            const usernameData = store.readQuery({
              query: USERNAME_QUERY,
              variables: {
                id: user.id,
                usernameId: username.id,
              },
            });
            const userData = store.readQuery({
              query: USER_QUERY,
              variables: {
                id: ownProps.auth.id,
              },
            });
            const updateFollowedOptimistic = _.some(updateFollowed.followeds, { id: username.id });
            const usernameAlreadyFollowed = _.some(usernameData.username.followers, { id: user.id }); // eslint-disable-line max-len
            if (updateFollowedOptimistic && !usernameAlreadyFollowed) usernameData.username.followersCount += 1; // eslint-disable-line max-len
            if (!updateFollowedOptimistic) usernameData.username.followersCount -= 1;
            // Write our data back to the cache.
            store.writeQuery({
              query: USER_QUERY,
              variables: {
                id: ownProps.auth.id,
              },
              data: userData,
            });
            // Write username data back to the cache
            store.writeQuery({
              query: USERNAME_QUERY,
              variables: {
                id: user.id,
                usernameId: username.id,
              },
              data: usernameData,
            });
          },
        }),
    };
  },
});

const mapStateToProps = ({ auth, user }) => ({
  auth,
  user,
});

export default compose(
  connect(mapStateToProps),
  updateFollowedMutation,
  usernameQuery,
  userQuery,
)(UsernameProfile);
