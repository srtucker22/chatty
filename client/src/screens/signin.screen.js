import React, { Component } from 'react';
import PropTypes from 'prop-types';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Button,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    backgroundColor: '#eeeeee',
    paddingHorizontal: 50,
  },
  inputContainer: {
    marginBottom: 20,
  },
  input: {
    height: 40,
    borderRadius: 4,
    marginVertical: 6,
    padding: 6,
    backgroundColor: 'rgba(0,0,0,0.2)',
  },
  loadingContainer: {
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    position: 'absolute',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  switchContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 12,
  },
  switchAction: {
    paddingHorizontal: 4,
    color: 'blue',
  },
  submit: {
    marginVertical: 6,
  },
});

class Signin extends Component {
  static navigationOptions = {
    title: 'Chatty',
    headerLeft: null,
  };

  constructor(props) {
    super(props);
    this.state = {
      view: 'login',
    };
    this.login = this.login.bind(this);
    this.signup = this.signup.bind(this);
    this.switchView = this.switchView.bind(this);
  }

  // fake for now
  login() {
    console.log('logging in');
    this.setState({ loading: true });
    setTimeout(() => {
      console.log('signing up');
      this.props.navigation.goBack();
    }, 1000);
  }

  // fake for now
  signup() {
    console.log('signing up');
    this.setState({ loading: true });
    setTimeout(() => {
      this.props.navigation.goBack();
    }, 1000);
  }

  switchView() {
    this.setState({
      view: this.state.view === 'signup' ? 'login' : 'signup',
    });
  }

  render() {
    const { view } = this.state;

    return (
      <KeyboardAvoidingView
        behavior={'padding'}
        style={styles.container}
      >
        {this.state.loading ?
          <View style={styles.loadingContainer}>
            <ActivityIndicator />
          </View> : undefined}
        <View style={styles.inputContainer}>
          <TextInput
            onChangeText={email => this.setState({ email })}
            placeholder={'Email'}
            style={styles.input}
          />
          <TextInput
            onChangeText={password => this.setState({ password })}
            placeholder={'Password'}
            secureTextEntry
            style={styles.input}
          />
        </View>
        <Button
          onPress={this[view]}
          style={styles.submit}
          title={view === 'signup' ? 'Sign up' : 'Login'}
          disabled={this.state.loading}
        />
        <View style={styles.switchContainer}>
          <Text>
            { view === 'signup' ?
              'Already have an account?' : 'New to Chatty?' }
          </Text>
          <TouchableOpacity
            onPress={this.switchView}
          >
            <Text style={styles.switchAction}>
              {view === 'login' ? 'Sign up' : 'Login'}
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    );
  }
}
Signin.propTypes = {
  navigation: PropTypes.shape({
    goBack: PropTypes.func,
  }),
};

export default Signin;
