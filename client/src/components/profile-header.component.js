import React from 'react';
import styled from 'styled-components/native';
import Touchable from '@appandflow/touchable';

const AVATAR_SIZE = 60;

const View = styled.View``;

const Root = styled.View`
  height: 210;
  alignSelf: stretch;
  paddingTop: 10;
  backgroundColor: ${props => props.theme.WHITE};
`;

const Heading = styled.View`
  flex: 1;
  flexDirection: row;
  alignItems: center;
  justifyContent: flex-start;
  paddingLeft: 15;
  paddingTop: 5;
`;

const Avatar = styled.Image`
  height: ${AVATAR_SIZE};
  width: ${AVATAR_SIZE};
  borderRadius: ${AVATAR_SIZE / 2};
  borderColor: ${props => props.theme.SECONDARY};
  borderWidth: 1;
`;

const UsernameContainer = styled.View`
  flex: 1;
  paddingLeft: 10;
  alignSelf: stretch;
`;

const FullName = styled.Text`
  color: ${props => props.theme.SECONDARY};
  fontWeight: bold;
  fontSize: 18;
`;

const UserName = styled.Text`
  color: ${props => props.theme.SECONDARY};
  fontSize: 15;
  opacity: 0.8;
`;

const MetaContainer = styled.View`
  flex: 0.8;
  flexDirection: column;
`;

const TopMetaContainer = styled.View`
  flex: 0.6;
  flexDirection: row;
`;

const BottomMetaContainer = styled.View`
  flex: 0.4;
  flexDirection: row;
`;

const Button = styled(Touchable).attrs({
  feedback: 'opacity',
}) `
  flex: 1;
  flexDirection: row;
  alignItems: center;
  justifyContent: space-around;
  paddingHorizontal: 60px;
`;

const ButtonText = styled.Text`
  fontSize: 14;
  fontWeight: 500;
  color: ${props => props.theme.LIGHT_GRAY};
`;

const MetaBox = styled.View`
  flex: 1;
  justifyContent: center;
  alignItems: center;
`;

const MetaTextContainer = styled.View`
  flex: 1;
  flexDirection: column;
`;

const TouchableMetaTextContainer = styled(Touchable).attrs({
  feedback: 'opacity',
}) `
  flex: 1;
  flexDirection: column;
`;

const MetaTextNumber = styled.Text`
  fontWeight: 600;
  fontSize: 16;
  color: ${props => props.theme.SECONDARY};
`;

const MetaTextLabel = styled.Text`
  fontSize: 12;
  fontWeight: 400;
  color: ${props => props.theme.LIGHT_GRAY};
`;

export default function ProfileHeader({
  firstName,
  lastName,
  avatar,
  username,
  followedsCount,
  followersCount,
  userIsFollowingUsername,
  updateFollowed,
  navToUsernameFollowers,
  navToUsernameFolloweds,
}) {
  return (
    <Root>
      <Heading>
        <Avatar source={{ uri: avatar }} />
        <MetaContainer>
          <TopMetaContainer>
            <MetaBox>
              <MetaTextContainer>
                <MetaTextNumber>314</MetaTextNumber>
                <MetaTextLabel>posts</MetaTextLabel>
              </MetaTextContainer>
            </MetaBox>
            <MetaBox>
              <TouchableMetaTextContainer onPress={navToUsernameFolloweds}>
                <View>
                  <MetaTextNumber>{followedsCount}</MetaTextNumber>
                  <MetaTextLabel>following</MetaTextLabel>
                </View>
              </TouchableMetaTextContainer>
            </MetaBox>
            <MetaBox>
              <TouchableMetaTextContainer onPress={navToUsernameFollowers}>
                <View>
                  <MetaTextNumber>{followersCount}</MetaTextNumber>
                  <MetaTextLabel>followers</MetaTextLabel>
                </View>
              </TouchableMetaTextContainer>
            </MetaBox>
          </TopMetaContainer>
          <BottomMetaContainer>
            <MetaBox>
              <Button onPress={updateFollowed}>
                <ButtonText>
                  {(userIsFollowingUsername) ? 'Unfollow' : 'Follow'}
                </ButtonText>
              </Button>
            </MetaBox>
          </BottomMetaContainer>

        </MetaContainer>
      </Heading>
      <UsernameContainer>
        <FullName>
          {firstName} {lastName}
        </FullName>
        <UserName>
          @{username}
        </UserName>
      </UsernameContainer>
    </Root>
  );
}
