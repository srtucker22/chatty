import React, { Component } from 'react';
import styled from 'styled-components/native';

const Root = styled.View``;

const T = styled.Text``;

class NewTweetScreen extends Component {
  state = {}
  render() {
    return (
      <Root>
        <T>New Post Screen</T>
      </Root>
    );
  }
}

export default NewTweetScreen;
