import PropTypes from 'prop-types';
import React, { Component } from 'react';
import styled from 'styled-components/native';
import { connect } from 'react-redux';
import { graphql, compose } from 'react-apollo';
import { FlatList } from 'react-native';
import { forEach } from 'lodash';

import FeedCard from '../components/feedcard/feedcard.component';

import { USER_QUERY } from '../graphql/user.query';

const Root = styled.View``;

const T = styled.Text``;

class FollowedsFeedScreen extends Component {
  static navigationOptions = {
    title: 'Chats',
  };
  constructor(props) {
    super(props);
    this.goToNewGroup = this.goToNewGroup.bind(this);
    this.onRefresh = this.onRefresh.bind(this);
  }
  onRefresh() {
    this.props.refetch();
    // faking unauthorized status
  }
  keyExtractor = item => item.id;
  goToNewGroup() {
    const { navigate } = this.props.navigation;
    navigate('NewGroup');
  }
  renderItem = ({ item }) => <FeedCard {...item} />;
  renderPlaceholder = () => (
    <FeedCard
      placeholder
      isLoaded={this.props.loading}
    />
  )

  render() {
    const { loading, user, networkStatus } = this.props;

    // render loading placeholder while we fetch messages
    if (loading || !user || !user.followedsTweetFeed) {
      return (
        <FlatList
          data={[1, 2, 3]}
          renderItem={this.renderPlaceholder}
          keyExtractor={item => item}
          contentContainerStyle={{ alignSelf: 'stretch' }}
        />
      );
    }

    if (user && !user.followedsTweetFeed.edges.length) {
      return (
        <View style={styles.container}>
          <Header onPress={this.goToNewGroup} />
          <Text style={styles.warning}>{'You are not following anyone yet.'}</Text>
        </View>
      );
    }

    const tweetData = [];
    if (user.followedsTweetFeed.edges.length) {
      forEach(user.followedsTweetFeed.edges, (edge) => {
        tweetData.push(edge.node);
      });
    }

    return (
      <Root>
        <FlatList
          data={tweetData}
          renderItem={this.renderItem}
          keyExtractor={this.keyExtractor}
          contentContainerStyle={{ alignSelf: 'stretch' }}
        />
      </Root>
    );
  }
}

FollowedsFeedScreen.propTypes = {
  navigation: PropTypes.shape({
    navigate: PropTypes.func,
  }),
  loading: PropTypes.bool,
  networkStatus: PropTypes.number,
  refetch: PropTypes.func,
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
  // followedsTweets: PropTypes.shape({
  //   id: PropTypes.number.isRequired,
  //   username: PropTypes.string.isRequired,
  //   followeds: PropTypes.arrayOf(
  //     PropTypes.shape({
  //       tweets: PropTypes.arrayOf(
  //         PropTypes.shape({
  //           id: PropTypes.number.isRequired,
  //           text: PropTypes.string,
  //           createdAt: PropTypes.string,
  //           author: PropTypes.shape({
  //             id: PropTypes.number.isRequired,
  //             username: PropTypes.string.isRequired,
  //             firstName: PropTypes.string.isRequired,
  //             lastName: PropTypes.string.isRequired,
  //             avatar: PropTypes.string.isRequired,
  //           }),
  //         }),
  //       ),
  //     }),
  //   ),
  // }),
};

const userQuery = graphql(USER_QUERY, {
  skip: ownProps => !ownProps.auth || !ownProps.auth.jwt,
  options: ownProps => ({ variables: { id: ownProps.auth.id } }),
  props: ({ data: { loading, networkStatus, refetch, user } }) => ({
    loading, networkStatus, refetch, user,
  }),
});

const mapStateToProps = ({ auth }) => ({
  auth,
});

export default compose(
  connect(mapStateToProps),
  userQuery,
)(FollowedsFeedScreen);

