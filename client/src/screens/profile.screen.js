import PropTypes from 'prop-types';
import React, { Component } from 'react';
import styled from 'styled-components/native';
import { connect } from 'react-redux';
import { graphql, compose } from 'react-apollo';
import { FlatList } from 'react-native';

import ProfileHeader from '../components/profile-header.component';
import FeedCard from '../components/feedcard/feedcard.component';

import { USER_QUERY } from '../graphql/user.query';


const Root = styled.View`
  flex: 1;
  backgroundColor: #f1f6fa;
`;

const T = styled.Text``;

const Header = ({ onPress }) => (
  <View style={styles.header}>
    <Button title={'New Conversation'} onPress={onPress} />
  </View>
);
Header.propTypes = {
  onPress: PropTypes.func.isRequired,
};

class ProfileScreen extends Component {
  static navigationOptions = {
    title: 'Chats',
  };

  constructor(props) {
    super(props);
    this.goToMessages = this.goToMessages.bind(this);
    this.goToNewGroup = this.goToNewGroup.bind(this);
    this.onRefresh = this.onRefresh.bind(this);
  }

  onRefresh() {
    this.props.refetch();
    // faking unauthorized status
  }

  keyExtractor = item => item.id;

  goToMessages(group) {
    const { navigate } = this.props.navigation;
    navigate('Messages', { groupId: group.id, title: group.name, icon: group.icon });
  }

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
    if (loading || !user) {
      return (
        <FlatList
          data={[1, 2, 3]}
          renderItem={this.renderPlaceholder}
          keyExtractor={item => item}
          contentContainerStyle={{ alignSelf: 'stretch' }}
        />
      );
    }

    if (user && !user.tweets.length) {
      return (
        <View style={styles.container}>
          <Header onPress={this.goToNewGroup} />
          <Text style={styles.warning}>{'You do not have any posts.'}</Text>
        </View>
      );
    }

    // render list of posts (tweets) for user
    return (
      <Root>
        <ProfileHeader {...user} />
        <FlatList
          data={user.tweets}
          renderItem={this.renderItem}
          keyExtractor={this.keyExtractor}
          contentContainerStyle={{ alignSelf: 'stretch' }}
        />
      </Root>
    );

    // render list of groups for user
    // return (
    //   <View style={styles.container}>
    //     <FlatList
    //       data={user.groups}
    //       keyExtractor={this.keyExtractor}
    //       renderItem={this.renderItem}
    //       ListHeaderComponent={() => <Header onPress={this.goToNewGroup} />}
    //       onRefresh={this.onRefresh}
    //       refreshing={networkStatus === 4}
    //     />
    //   </View>
    // );
  }
}
ProfileScreen.propTypes = {
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
    avatar: PropTypes.string.isRequired,
    groups: PropTypes.arrayOf(
      PropTypes.shape({
        id: PropTypes.number.isRequired,
        name: PropTypes.string.isRequired,
      }),
    ),
  }),
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
)(ProfileScreen);
