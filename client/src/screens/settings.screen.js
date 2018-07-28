import React, { Component, PropTypes } from 'react';
import {
  ActivityIndicator,
  Button,
  Image,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { connect } from 'react-redux';
import { graphql, compose } from 'react-apollo';
import ImagePicker from 'react-native-image-crop-picker';
import Spinner from 'react-native-loading-spinner-overlay';
import { ReactNativeFile } from 'apollo-upload-client';

import USER_QUERY from '../graphql/user.query';
import UPDATE_USER_MUTATION from '../graphql/update-user.mutation';
import { logout, setCurrentUser } from '../actions/auth.actions';

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  email: {
    borderColor: '#777',
    borderBottomWidth: 1,
    borderTopWidth: 1,
    paddingVertical: 8,
    paddingHorizontal: 16,
    fontSize: 16,
  },
  emailHeader: {
    backgroundColor: '#dbdbdb',
    color: '#777',
    paddingHorizontal: 16,
    paddingBottom: 6,
    paddingTop: 32,
    fontSize: 12,
  },
  loading: {
    justifyContent: 'center',
    flex: 1,
  },
  userImage: {
    width: 54,
    height: 54,
    borderRadius: 27,
  },
  imageContainer: {
    paddingRight: 20,
    alignItems: 'center',
  },
  input: {
    color: 'black',
    height: 32,
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
    flex: 1,
  },
  userContainer: {
    paddingLeft: 16,
  },
  userInner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingRight: 16,
  },
});

class Settings extends Component {
  static navigationOptions = ({ navigation }) => {
    const { state } = navigation;
    const isReady = state.params && state.params.mode === 'ready';
    return {
      title: 'Settings',
      headerLeft: (
        isReady ? <Button
          title="Cancel"
          onPress={state.params.cancel}
        /> : undefined
      ),
      headerRight: (
        isReady ? <Button
          title="Done"
          onPress={state.params.updateUser}
        /> : undefined
      ),
    };
  };

  constructor(props) {
    super(props);

    this.state = {};

    this.cancel = this.cancel.bind(this);
    this.getAvatar = this.getAvatar.bind(this);
    this.logout = this.logout.bind(this);
    this.refreshNavigation = this.refreshNavigation.bind(this);
    this.updateUser = this.updateUser.bind(this);
  }

  componentWillUpdate(nextProps, nextState) {
    if (!!this.state.username !== !!nextState.username || !!this.state.avatar !== !!nextState.avatar) {
      this.refreshNavigation(nextProps, nextState);
    }
  }

  getAvatar() {
    const self = this;
    ImagePicker.openPicker({
      width: 100,
      height: 100,
      cropping: true,
      cropperCircleOverlay: true,
    }).then((file) => {
      const avatar = new ReactNativeFile({
        name: 'avatar',
        type: file.mime,
        size: file.size,
        path: file.path,
        uri: file.path,
      });
      self.setState({ avatar });
    });
  }

  cancel() {
    this.setState({
      avatar: null,
      username: null,
      updating: false,
    });
  }

  logout() {
    // clear the registrationId for notifications before logout
    this.props.updateUser({ registrationId: null }).then(() => {
      // log out the user
      this.props.dispatch(logout());
    });
  }

  updateUser() {
    const { username, avatar } = this.state;
    this.setState({ updating: true });
    this.props.updateUser({ username, avatar }).then(({ data: { updateUser } }) => {
      this.props.dispatch(setCurrentUser(updateUser));
      this.cancel();
    });
  }

  refreshNavigation(props, state) {
    const { navigation, user } = props;
    navigation.setParams({
      mode: (state.username && user.username !== state.username) ||
        state.avatar ? 'ready' : undefined,
      updateUser: this.updateUser,
      cancel: this.cancel,
    });
  }

  render() {
    const { loading, user } = this.props;

    // render loading placeholder while we fetch data
    if (loading || !user) {
      return (
        <View style={[styles.loading, styles.container]}>
          <ActivityIndicator />
        </View>
      );
    }

    return (
      <View style={styles.container}>
        <Spinner visible={this.state.updating} />
        <View style={styles.userContainer}>
          <View style={styles.userInner}>
            <TouchableOpacity style={styles.imageContainer} onPress={this.getAvatar}>
              <Image
                style={styles.userImage}
                source={this.state.avatar || { uri: user.avatar || 'https://facebook.github.io/react/img/logo_og.png' }}
                cache={'force-cache'}
              />
              <Text>edit</Text>
            </TouchableOpacity>
            <Text style={styles.inputInstructions}>
              Enter your name and add an optional profile picture
            </Text>
          </View>
          <View style={styles.inputBorder}>
            <TextInput
              onChangeText={username => this.setState({ username })}
              placeholder={user.username}
              style={styles.input}
              defaultValue={user.username}
            />
          </View>
        </View>
        <Text style={styles.emailHeader}>{'EMAIL'}</Text>
        <Text style={styles.email}>{user.email}</Text>
        <Button title={'Logout'} onPress={this.logout} />
      </View>
    );
  }
}

Settings.propTypes = {
  auth: PropTypes.shape({
    loading: PropTypes.bool,
    jwt: PropTypes.string,
  }).isRequired,
  dispatch: PropTypes.func.isRequired,
  loading: PropTypes.bool,
  navigation: PropTypes.shape({
    navigate: PropTypes.func,
  }),
  updateUser: PropTypes.func,
  user: PropTypes.shape({
    username: PropTypes.string,
  }),
};

const userQuery = graphql(USER_QUERY, {
  skip: ownProps => !ownProps.auth || !ownProps.auth.jwt,
  options: ({ auth }) => ({ variables: { id: auth.id }, fetchPolicy: 'cache-only' }),
  props: ({ data: { loading, user } }) => ({
    loading, user,
  }),
});

const updateUserMutation = graphql(UPDATE_USER_MUTATION, {
  props: ({ mutate }) => ({
    updateUser: user =>
      mutate({
        variables: { user },
      }),
  }),
});

const mapStateToProps = ({ auth }) => ({
  auth,
});

export default compose(
  connect(mapStateToProps),
  updateUserMutation,
  userQuery,
)(Settings);
