import { _ } from 'lodash';
import React, { Component } from 'react';
import PropTypes from 'prop-types';
import {
  ActivityIndicator,
  Button,
  SectionList,
  StyleSheet,
  Text,
  View,
  H1,
} from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome';

import { graphql, compose } from 'react-apollo';
import { NavigationActions } from 'react-navigation';
import sectionListGetItemLayout from 'react-native-section-list-get-item-layout';
import update from 'immutability-helper';
import { connect } from 'react-redux';

import USER_QUERY from '../graphql/user.query';
import CREATE_GROUP_MUTATION from '../graphql/create-group.mutation';

import UserListItem from '../components/user-list-item.component';
import ButtonHeader from '../components/button-header.component';

import sortObject from '../utils/formatters';
import { colors, language } from '../utils/constants';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'white',
  },
  selected: {
    flexDirection: 'row',
  },
  loading: {
    justifyContent: 'center',
    flex: 1,
  },
  navIcon: {
    color: 'blue',
    fontSize: 18,
    paddingTop: 2,
  },
});

const SectionHeader = ({ title }) => {
  // inline styles used for brevity, use a stylesheet when possible
  const textStyle = {
    textAlign: 'center',
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  };

  const viewStyle = {
    backgroundColor: '#ccc',
  };
  return (
    <View style={viewStyle}>
      <Text style={textStyle}>{title}</Text>
    </View>
  );
};
SectionHeader.propTypes = {
  title: PropTypes.string,
};

const SectionItem = ({ title }) => (
  <Text style={{ color: 'blue' }}>{title}</Text>
);
SectionItem.propTypes = {
  title: PropTypes.string,
};

class NewConversation extends Component {
  static navigationOptions = ({ navigation }) => {
    const { state, navigate } = navigation;
    // const isReady = state.params && state.params.mode === 'ready';
    // const {
    //   isAllowedGlobalSearch,
    //   isRandomConversation,
    // } = state.params;
    const destination = (state.params && state.params.create) ? state.params.create : 'UsernameProfile';

    return {
      title: 'New Conversation',
      headerRight: (
        <ButtonHeader
          side="right"
          onPress={() => {
            return navigate('UsernameSearch', {
              destination,
            });
          }
          }
        >
          <Icon color={colors.PRIMARY} size={20} name="pencil" />
        </ButtonHeader>
      ),
    };
  };

  constructor(props) {
    super(props);

    let selected = [];
    if (this.props.navigation.state.params) {
      selected = this.props.navigation.state.params.selected;
    }

    this.state = {
      selected: selected || [],
      followers: props.user ? props.user.followers : [],
    };

    this.create = this.create.bind(this);
    this.goToNewConversation = this.goToNewConversation.bind(this);
    this.goToUsernameProfile = this.goToUsernameProfile.bind(this);

    this.getItemLayout = sectionListGetItemLayout({
      // The height of the row with rowData at the given sectionIndex and rowIndex
      getItemHeight: (rowData, sectionIndex, rowIndex) => sectionIndex === 0 ? 100 : 50,

      // These three properties are optional
      // getSeparatorHeight: () => 1 / PixelRatio.get(), // The height of your separators
      getSectionHeaderHeight: () => 20, // The height of your section headers
      getSectionFooterHeight: () => 10, // The height of your section footers
    });
  }

  componentDidMount() {
    this.refreshNavigation(this.state.selected);
  }

  componentWillReceiveProps(nextProps) {
    const state = {};
    if (nextProps.user && nextProps.user.followers && nextProps.user !== this.props.user) {
      // TODO fix bug formatters is not a function (with [] empty followers only?)
      state.followers = nextProps.user.followers;
    }

    if (nextProps.navigation.state.params && nextProps.navigation.state.params.selected) {
      Object.assign(state, {
        selected: nextProps.navigation.state.params.selected,
      });
    }

    if (nextProps.selected) {
      Object.assign(state, {
        selected: nextProps.selected,
      });
    }

    this.setState(state);
  }

  componentWillUpdate(nextProps, nextState) {
    console.log('componentWillUpdate', nextProps, nextState);
    if (!!this.state.selected.length !== !!nextState.selected.length) {
      this.refreshNavigation(nextState.selected);
    }
  }

  refreshNavigation(ready) {
    const { navigation } = this.props;
    navigation.setParams({
      mode: ready ? 'ready' : undefined,
      create: this.create,
      // destination: this.create,
    });
  }

  goToNewConversation = group => NavigationActions.reset({
    index: 1,
    actions: [
      NavigationActions.navigate({ routeName: 'Main' }),
      NavigationActions.navigate({ routeName: 'Messages', params: { groupId: group.id, title: group.name, icon: group.icon } }),
    ],
  });

  goToUsernameProfile(item) {
    const { navigation, user } = this.props;
    navigation.navigate('UsernameProfile', {
      selectedUser: item,
      userId: user.id,
    });
  }

  create(selectedUsers) {
    const { createGroup } = this.props;
    const recipients = [selectedUsers] || this.state.selected;

    createGroup({
      name: `${recipients[0].username} Convo`,
      userIds: _.map(recipients, 'id'),
      icon: this.state.icon,
    }).then((res) => {
      this.props.navigation.dispatch(this.goToNewConversation(res.data.createGroup));
    }).catch((error) => {
      Alert.alert(
        'Error Creating New Conversation',
        error.message,
        [
          { text: 'OK', onPress: () => { } },
        ],
      );
    });
  }      

  render() {
    const { user, loading } = this.props;

    // render loading placeholder while we fetch messages
    if (loading || !user) {
      return (
        <View style={[styles.loading, styles.container]}>
          <ActivityIndicator />
        </View>
      );
    }

    if (this.state.followers && !this.state.followers.length) {
      return (
        <View style={styles.container}>
          { /* <Header onPress={this.goToNewGroup} /> */ }
          <Text style={styles.warning}>{'Looks like you have no followers yet.'}</Text>
        </View>
      );
    }

    const renderFollowerRow = ({ item, index, section }) => (
      <UserListItem
        item={item}
        onThumbnailActionSelect={() => this.goToUsernameProfile(item)}
        onMainActionSelect={() => this.create(item)}
        mainActionType="write"
      />
    );

    const sectionKeyExtractor = section => item => `${section}${item.id}`;
    console.log(renderFollowerRow);
    console.log(sectionKeyExtractor(1)({ id: 1, username: 'Joe' }));

    return (
      <SectionList
        renderSectionHeader={({ section }) => <Text title={section.title}>{section.title}</Text>}
        sections={[ // heterogeneous rendering between sections
          {
            title: 'Following',
            data: this.props.user.followeds,
            keyExtractor: sectionKeyExtractor(0),
            renderItem: renderFollowerRow,
          },
          {
            title: 'Followers',
            data: this.state.followers,
            keyExtractor: sectionKeyExtractor(1),
            renderItem: renderFollowerRow,
          },
        ]}
        getItemLayout={this.getItemLayout}
      />
    );

    // return (
    //   <View style={styles.container}>
    //     {this.state.selected.length ? <View style={styles.selected}>
    //       <SelectedUserList
    //         data={this.state.selected}
    //         remove={this.toggle}
    //       />
    //     </View> : undefined}
    //     {_.keys(this.state.followers).length ? <AlphabetListView
    //       style={{ flex: 1 }}
    //       data={this.state.followers}
    //       cell={UserListItem}
    //       cellHeight={30}
    //       cellProps={{
    //         isSelected: this.isSelected,
    //         toggle: this.toggle,
    //       }}
    //       sectionListItem={SectionItem}
    //       sectionHeader={SectionHeader}
    //       sectionHeaderHeight={22.5}
    //     /> : undefined}
    //   </View>
    // );
  }
}

NewConversation.propTypes = {
  loading: PropTypes.bool.isRequired,
  createGroup: PropTypes.func.isRequired,
  navigation: PropTypes.shape({
    dispatch: PropTypes.func,
    navigate: PropTypes.func,
    setParams: PropTypes.func,
    state: PropTypes.shape({
      params: PropTypes.object,
    }),
  }),
  user: PropTypes.shape({
    id: PropTypes.number,
    followers: PropTypes.arrayOf(PropTypes.shape({
      id: PropTypes.number,
      username: PropTypes.string,
    })),
  }),
  selected: PropTypes.arrayOf(PropTypes.object),
};

const createGroupMutation = graphql(CREATE_GROUP_MUTATION, {
  props: ({ ownProps, mutate }) => ({
    createGroup: group =>
      mutate({
        variables: { group },
        update: (store, { data: { createGroup } }) => {
          // Read the data from our cache for this query.
          const data = store.readQuery({ query: USER_QUERY, variables: { id: ownProps.auth.id } });

          // Add our message from the mutation to the end.
          data.user.groups.push(createGroup);

          // Write our data back to the cache.
          store.writeQuery({
            query: USER_QUERY,
            variables: { id: ownProps.auth.id },
            data,
          });
        },
      }),
  }),
});

const userQuery = graphql(USER_QUERY, {
  options: ownProps => ({ variables: { id: ownProps.auth.id } }),
  props: ({ data: { loading, user } }) => ({
    loading, user,
  }),
});

const mapStateToProps = ({ auth }) => ({
  auth,
});

export default compose(
  connect(mapStateToProps),
  userQuery,
  createGroupMutation,
)(NewConversation);
