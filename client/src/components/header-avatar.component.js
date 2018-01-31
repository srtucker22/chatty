import React, { Component, PropTypes } from 'react';
import styled from 'styled-components/native';
import { connect } from 'react-redux';
import { graphql, compose } from 'react-apollo';
// import ActionSheet from 'react-native-actionsheet';

// import { logout } from '../actions/user';
// import { logout, setCurrentUser } from '../actions/auth.actions';
import USER_QUERY from '../graphql/user.query';


import Loading from './loading.component';
import ButtonHeader from './button-header.component';

const AVATAR_SIZE = 30;
const AVATAR_RADIUS = AVATAR_SIZE / 2;

const Avatar = styled.Image`
  height: ${AVATAR_SIZE};
  width: ${AVATAR_SIZE};
  borderRadius: ${AVATAR_RADIUS};
`;

class HeaderAvatar extends Component {
  // onOpenActionSheet = () => {
  //   const options = ['Logout', 'Cancel'];
  //   const destructiveButtonIndex = 0;
  //   this.props.showActionSheetWithOptions(
  //     {
  //       options,
  //       destructiveButtonIndex,
  //     },
  //     buttonIndex => {
  //       if (buttonIndex === 0) {
  //         // this.props.client.resetStore()
  //         // return this.props.logout();
  //       }
  //     },
  //   );
  // };

  render() {
    const { user } = this.props;
    if (!user) {
      return (
        <ButtonHeader side="left" disabled>
          <Loading size="small" />
        </ButtonHeader>
      );
    }
    return (
      // <ButtonHeader side="left" onPress={this.onOpenActionSheet}>
      <ButtonHeader side="left">
        { /* <Avatar source={this.state.avatar || { uri: user.avatar || 'https://reactjs.org/logo-og.png' }} /> */ }
        <Avatar source={{ uri: user.avatar || 'https://reactjs.org/logo-og.png' }} />
      </ButtonHeader>
    );
  }
}

HeaderAvatar.propTypes = {
  auth: PropTypes.shape({
    loading: PropTypes.bool,
    jwt: PropTypes.string,
  }).isRequired,
  // dispatch: PropTypes.func.isRequired,
  loading: PropTypes.bool,
  // navigation: PropTypes.shape({
  //   navigate: PropTypes.func,
  // }),
  // updateUser: PropTypes.func,
  user: PropTypes.shape({
    username: PropTypes.string,
  }),
};

// TODO DRY
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

// const updateUserMutation = graphql(UPDATE_USER_MUTATION, {
//   props: ({ mutate }) => ({
//     updateUser: user =>
//       mutate({
//         variables: { user },
//       }),
//   }),
// });

export default compose(
  connect(mapStateToProps),
  // updateUserMutation,
  userQuery,
)(HeaderAvatar);

// export default withApollo(connect(state => ({ info: state.user.info }), { logout })(
//   connectActionSheet(HeaderAvatar),
// ));
