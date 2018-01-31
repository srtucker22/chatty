import React, { Component } from 'react';
import styled from 'styled-components/native';

const Root = styled.View``;

const T = styled.Text``;

class NewMessageScreen extends Component {
  state = {}
  render() {
    return (
      <Root>
        <T>New Message</T>
      </Root>
    );
  }
}

export default NewMessageScreen;
