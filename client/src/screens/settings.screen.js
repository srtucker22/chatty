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

import USER_QUERY from '../graphql/user.query';
import { logout } from '../actions/auth.actions';

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
  static navigationOptions = {
    title: 'Settings',
  };

  constructor(props) {
    super(props);

    this.state = {};

    this.logout = this.logout.bind(this);
  }

  logout() {
    this.props.dispatch(logout());
  }

  // eslint-disable-next-line
  updateUsername(username) {
    // eslint-disable-next-line
    console.log('TODO: update username');
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
        <View style={styles.userContainer}>
          <View style={styles.userInner}>
            <TouchableOpacity style={styles.imageContainer}>
              <Image
                style={styles.userImage}
                source={{ uri: 'https://facebook.github.io/react/img/logo_og.png' }}
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

const mapStateToProps = ({ auth }) => ({
  auth,
});

export default compose(
  connect(mapStateToProps),
  userQuery,
)(Settings);
