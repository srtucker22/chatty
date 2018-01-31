import gql from 'graphql-tag';

const FAVORITE_TWEET_MUTATION = gql`
  mutation favoriteTweet($id: Int!) {
    favoriteTweet(id: $id) {
      isFavorited
      favoriteCount
      id
    }
  }
`;


export default FAVORITE_TWEET_MUTATION;
