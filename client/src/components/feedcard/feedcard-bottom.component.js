import React from 'react';
import styled from 'styled-components/native';
import Icon from 'react-native-vector-icons/FontAwesome';
import Touchable from '@appandflow/touchable';

import { colors } from '../../utils/constants';

const ICON_SIZE = 20;

const Root = styled.View`
  height: 40;
  flexDirection: row;
`;

const Button = styled(Touchable).attrs({
  feedback: 'opacity',
})`
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

function FeedCardBottom({ favoriteCount, onFavoritePress, isFavorited }) {
  return (
    <Root>
      <Button>
        <Icon
          name="comments"
          size={ICON_SIZE}
          color={colors.LIGHT_GRAY}
        />
        <ButtonText>
          1
        </ButtonText>
      </Button>
      <Button onPress={onFavoritePress}>
        <Icon
          name="heart"
          color={isFavorited ? 'red' : colors.LIGHT_GRAY}
          size={ICON_SIZE}
        />
        <ButtonText>
          {favoriteCount}
        </ButtonText>
      </Button>
    </Root>
  );
}

export default FeedCardBottom;
