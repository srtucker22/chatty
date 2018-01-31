import gql from 'graphql-tag';

export const UPDATE_FOLLOWED_MUTATION = gql`
  mutation updateFollowed($user: UpdateFollowedInput!) {
    updateFollowed(user: $user) {
      id
      username
      followedsCount
      followeds {
        id
        username
      }
    }
  }
`;

export default UPDATE_FOLLOWED_MUTATION;
