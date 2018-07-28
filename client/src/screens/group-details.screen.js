// TODO: update group functionality
import React, { Component } from 'react';
import PropTypes from 'prop-types';
import {
  ActivityIndicator,
  Button,
  Image,
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { graphql, compose } from 'react-apollo';
import { NavigationActions } from 'react-navigation';
import { connect } from 'react-redux';
import ImagePicker from 'react-native-image-crop-picker';
import Spinner from 'react-native-loading-spinner-overlay';
import { ReactNativeFile } from 'apollo-upload-client';

import GROUP_QUERY from '../graphql/group.query';
import USER_QUERY from '../graphql/user.query';
import DELETE_GROUP_MUTATION from '../graphql/delete-group.mutation';
import LEAVE_GROUP_MUTATION from '../graphql/leave-group.mutation';
import UPDATE_GROUP_MUTATION from '../graphql/update-group.mutation';

const resetAction = NavigationActions.reset({
  index: 0,
  actions: [
    NavigationActions.navigate({ routeName: 'Main' }),
  ],
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  detailsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  groupImageContainer: {
    paddingTop: 20,
    paddingHorizontal: 20,
    paddingBottom: 6,
    alignItems: 'center',
  },
  groupName: {
    color: 'black',
    height: 32,
  },
  groupNameBorder: {
    borderBottomWidth: 1,
    borderColor: '#dbdbdb',
    borderTopWidth: 1,
    flex: 1,
    paddingVertical: 8,
  },
  groupImage: {
    width: 54,
    height: 54,
    borderRadius: 27,
  },
  participants: {
    borderBottomWidth: 1,
    borderColor: '#dbdbdb',
    borderTopWidth: 1,
    paddingHorizontal: 20,
    paddingVertical: 6,
    backgroundColor: '#dbdbdb',
    color: '#777',
  },
  user: {
    alignItems: 'center',
    borderBottomWidth: 1,
    borderColor: '#dbdbdb',
    flexDirection: 'row',
    padding: 10,
  },
  username: {
    flex: 1,
    fontSize: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
});

class GroupDetails extends Component {
  static navigationOptions = ({ navigation }) => {
    const { state } = navigation;
    const isReady = state.params && state.params.mode === 'ready';
    return {
      title: `${navigation.state.params.title}`,
      headerRight: (
        isReady ? <Button
          title="Done"
          onPress={state.params.updateGroup}
        /> : undefined
      ),
    };
  };

  constructor(props) {
    super(props);

    this.state = {};

    this.cancel = this.cancel.bind(this);
    this.deleteGroup = this.deleteGroup.bind(this);
    this.getIcon = this.getIcon.bind(this);
    this.headerComponent = this.headerComponent.bind(this);
    this.leaveGroup = this.leaveGroup.bind(this);
    this.onChangeText = this.onChangeText.bind(this);
    this.refreshNavigation = this.refreshNavigation.bind(this);
    this.renderItem = this.renderItem.bind(this);
    this.updateGroup = this.updateGroup.bind(this);
  }

  componentWillUpdate(nextProps, nextState) {
    if (!!this.state.name !== !!nextState.name || !!this.state.icon !== !!nextState.icon) {
      this.refreshNavigation(nextProps, nextState);
    }
  }

  getIcon() {
    const self = this;
    ImagePicker.openPicker({
      width: 100,
      height: 100,
      cropping: true,
      cropperCircleOverlay: true,
    }).then((file) => {
      const icon = new ReactNativeFile({
        name: 'avatar',
        type: file.mime,
        size: file.size,
        path: file.path,
        uri: file.path,
      });
      self.setState({ icon });
    });
  }

  onChangeText(name) {
    this.setState({ name });
  }

  refreshNavigation(props, state) {
    const { navigation, group } = props;
    navigation.setParams({
      mode: (state.name && group.name !== state.name) ||
        state.icon ? 'ready' : undefined,
      updateGroup: this.updateGroup,
      cancel: this.cancel,
    });
  }

  cancel() {
    this.setState({
      icon: null,
      name: null,
      updating: false,
    });
  }

  deleteGroup() {
    this.props.deleteGroup(this.props.navigation.state.params.id)
      .then(() => {
        this.props.navigation.dispatch(resetAction);
      })
      .catch((e) => {
        console.log(e);   // eslint-disable-line no-console
      });
  }

  leaveGroup() {
    this.props.leaveGroup({
      id: this.props.navigation.state.params.id,
    })
      .then(() => {
        this.props.navigation.dispatch(resetAction);
      })
      .catch((e) => {
        console.log(e);   // eslint-disable-line no-console
      });
  }

  updateGroup() {
    const { id } = this.props.group;
    const { name, icon } = this.state;
    this.setState({ updating: true });
    this.props.updateGroup({ id, name, icon }).then(this.cancel);
  }

  keyExtractor = item => item.id;

  headerComponent() {
    const { group } = this.props;

    return (
      <View>
        <View style={styles.detailsContainer}>
          <TouchableOpacity style={styles.groupImageContainer} onPress={this.getIcon}>
            <Image
              style={styles.groupImage}
              source={this.state.icon || { uri: group.icon || 'https://facebook.github.io/react/img/logo_og.png' }}
              cache={'force-cache'}
            />
            <Text>edit</Text>
          </TouchableOpacity>
          <View style={styles.groupNameBorder}>
            <TextInput
              onChangeText={this.onChangeText}
              placeholder={group.name}
              style={styles.groupName}
              defaultValue={group.name}
            />
          </View>
        </View>
        <Text style={styles.participants}>
          {`participants: ${group.users.length}`.toUpperCase()}
        </Text>
      </View>
    );
  }

  renderItem = ({ item: user }) => (
    <View style={styles.user}>
      <Image
        style={styles.avatar}
        source={{ uri: user.avatar || 'https://facebook.github.io/react/img/logo_og.png' }}
        cache={'force-cache'}
      />
      <Text style={styles.username}>{user.username}</Text>
    </View>
  )

  render() {
    const { group, loading } = this.props;

    // render loading placeholder while we fetch messages
    if (!group || loading) {
      return (
        <View style={[styles.loading, styles.container]}>
          <ActivityIndicator />
        </View>
      );
    }

    return (
      <View style={styles.container}>
        <Spinner visible={this.state.updating} />
        <FlatList
          data={group.users}
          keyExtractor={this.keyExtractor}
          renderItem={this.renderItem}
          ListHeaderComponent={this.headerComponent}
          ListFooterComponent={() => (
            <View>
              <Button title={'Leave Group'} onPress={this.leaveGroup} />
              <Button title={'Delete Group'} onPress={this.deleteGroup} />
            </View>
          )}
        />
      </View>
    );
  }
}

GroupDetails.propTypes = {
  loading: PropTypes.bool,
  group: PropTypes.shape({
    id: PropTypes.number,
    name: PropTypes.string,
    users: PropTypes.arrayOf(PropTypes.shape({
      id: PropTypes.number,
      username: PropTypes.string,
    })),
  }),
  navigation: PropTypes.shape({
    dispatch: PropTypes.func,
    state: PropTypes.shape({
      params: PropTypes.shape({
        title: PropTypes.string,
        id: PropTypes.number,
      }),
    }),
  }),
  deleteGroup: PropTypes.func.isRequired,
  leaveGroup: PropTypes.func.isRequired,
  updateGroup: PropTypes.func,
};

const groupQuery = graphql(GROUP_QUERY, {
  options: ownProps => ({ variables: { groupId: ownProps.navigation.state.params.id } }),
  props: ({ data: { loading, group } }) => ({
    loading,
    group,
  }),
});

const deleteGroupMutation = graphql(DELETE_GROUP_MUTATION, {
  props: ({ ownProps, mutate }) => ({
    deleteGroup: id =>
      mutate({
        variables: { id },
        update: (store, { data: { deleteGroup } }) => {
          // Read the data from our cache for this query.
          const data = store.readQuery({ query: USER_QUERY, variables: { id: ownProps.auth.id } });

          // Add our message from the mutation to the end.
          data.user.groups = data.user.groups.filter(g => deleteGroup.id !== g.id);

          // Write our data back to the cache.
          store.writeQuery({
            query: USER_QUERY,
            variables: { id: ownProps.auth.id },
            data,
          });
        },
      }),
  }),
});

const leaveGroupMutation = graphql(LEAVE_GROUP_MUTATION, {
  props: ({ ownProps, mutate }) => ({
    leaveGroup: ({ id }) =>
      mutate({
        variables: { id },
        update: (store, { data: { leaveGroup } }) => {
          // Read the data from our cache for this query.
          const data = store.readQuery({ query: USER_QUERY, variables: { id: ownProps.auth.id } });

          // Add our message from the mutation to the end.
          data.user.groups = data.user.groups.filter(g => leaveGroup.id !== g.id);

          // Write our data back to the cache.
          store.writeQuery({
            query: USER_QUERY,
            variables: { id: ownProps.auth.id },
            data,
          });
        },
      }),
  }),
});

const updateGroupMutation = graphql(UPDATE_GROUP_MUTATION, {
  props: ({ mutate }) => ({
    updateGroup: group =>
      mutate({
        variables: { group },
      }),
  }),
});

const mapStateToProps = ({ auth }) => ({
  auth,
});

export default compose(
  connect(mapStateToProps),
  groupQuery,
  deleteGroupMutation,
  leaveGroupMutation,
  updateGroupMutation,
)(GroupDetails);
