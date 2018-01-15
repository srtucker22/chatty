import gql from 'graphql-tag';

// get the user and all user's groups
export const USERNAME_QUERY = gql`
  query username($id: Int, $usernameId: Int) {
    username(id: $id, usernameId: $usernameId) {
      id
      avatar
      badgeCount
      firstName
      lastName
      username
      followedsCount
      followersCount
      followeds {
        id
        username
      }
      followers {
        id
        username
      }
      tweets {
        id
        text
        createdAt
        author {
          id
          username
          firstName
          lastName
          avatar
        }
      }
    }
  }
`;

export default USERNAME_QUERY;
