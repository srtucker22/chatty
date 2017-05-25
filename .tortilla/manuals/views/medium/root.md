# Chatty

[//]: # (head-end)


## A WhatsApp clone with React Native and Apollo

* [Overview](#overview)
* [Steps](#steps)
* [Installing](#installing)
* [Getting Started](#getting-started)
* [Contributing](#contributing)
* [Licence](#licence)

# Overview
View the Medium blog for this tutorial [here](https://medium.com/react-native-training/building-chatty-a-whatsapp-clone-with-react-native-and-apollo-part-1-setup-68a02f7e11).

This tutorial was created using [tortilla](https://github.com/Urigo/tortilla), an incredible framework for building tutorials.

Starting with the very first commit, every commit in Chatty represents the next step in the tutorial. Follow the tutorial for a guided walk through the code, or investigate a commit to see exactly what code changed for a given step. Since this is git, you can even download the app at any step in the tutorial -- how cool is that?!

# Steps
1. [Setup](/.tortilla/manuals/views/step1.md)
2. [GraphQL Queries with ApolloServer](/.tortilla/manuals/views/step2.md)
3. [GraphQL Queries with React Apollo](/.tortilla/manuals/views/step3.md)
4. [GraphQL Mutations & Optimistic UI](/.tortilla/manuals/views/step4.md)
5. [GraphQL Pagination](/.tortilla/manuals/views/step5.md)
6. [GraphQL Subscriptions](/.tortilla/manuals/views/step6.md)
7. [GraphQL Authentication](/.tortilla/manuals/views/step7.md)
8. [GraphQL Input Types](/.tortilla/manuals/views/step8.md)

# Installing
```sh
npm install                       # install server dependencies
cd client && npm install          # install client dependencies
```
For Steps 7 and higher, please enter your configuration variables in `.env`:
```
# use your own secret!!!
JWT_SECRET=your_secret
```

# Getting Started
```sh
npm start                         # start the server
cd client && react-native run-ios  # start RN client
```

# Contributing
This project welcomes code contributions, bug reports and feature requests. Please see the guidelines in [CONTRIBUTING.MD](CONTRIBUTING.MD) if you are interested in contributing.

# License
MIT License

Copyright (c) 2018 Simon Tucker

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.


[//]: # (foot-start)

[{]: <helper> (navStep)

<b>║</b> <a href=".tortilla/manuals/views/step1.md">BEGIN TUTORIAL</a> ⟹

[}]: #
