import React from 'react';
import styled from 'styled-components/native';
import distanceInWordsToNow from 'date-fns/distance_in_words_to_now';

import { fakeAvatar } from '../../utils/constants';

const AVATAR_SIZE = 40;
const AVATAR_RADIUS = AVATAR_SIZE / 2;

const Root = styled.View`
  height: 50;
  flexDirection: row;
  alignItems: center;
`;

const AvatarContainer = styled.View`
  flex: 0.2;
  justifyContent: center;
  alignSelf: stretch;
`;

const Avatar = styled.Image`
  height: ${AVATAR_SIZE};
  width: ${AVATAR_SIZE};
  borderRadius: ${AVATAR_RADIUS};
`;

const MetaContainer = styled.View`
  flex: 1;
  alignSelf: stretch;
`;

const MetaTopContainer = styled.View`
  flex: 1;
  alignSelf: stretch;
  flexDirection: row;
  alignItems: center;
  justifyContent: flex-start;
`;

const MetaBottomContainer = styled.View`
  flex: 0.8;
  alignSelf: stretch;
  alignItems: flex-start;
  justifyContent: center;
`;

const MetaFullName = styled.Text`
  fontSize: 16;
  fontWeight: bold;
  color: ${props => props.theme.SECONDARY};
`;

const MetaText = styled.Text`
  fontSize: 14;
  fontWeight: 600;
  color: ${props => props.theme.LIGHT_GRAY};
`;

function FeedCardHeader({ username, firstName, lastName, avatar, createdAt }) {
  return (
    <Root>
      <AvatarContainer>
        <Avatar source={{ uri: avatar || fakeAvatar }} />
      </AvatarContainer>
      <MetaContainer>
        <MetaTopContainer>
          <MetaFullName>
            {firstName} {lastName}
          </MetaFullName>
          <MetaText style={{ marginLeft: 5 }}>
            @{username}
          </MetaText>
        </MetaTopContainer>
        <MetaBottomContainer>
          <MetaText>
            {distanceInWordsToNow(createdAt)} ago
          </MetaText>
        </MetaBottomContainer>
      </MetaContainer>
    </Root>
  )
}

export default FeedCardHeader;
