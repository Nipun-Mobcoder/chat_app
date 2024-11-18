const typeDefs = `

    scalar Upload

    enum UserRole {
        User
        Admin
    }

    type Message {
        id: ID!
        sender: String
        message: String
        file: File
        createdAt: String
        to: String
    }

    type User {
        userName: String!
        email: String!
    }

    type File {
        filename: String
        mimetype: String
        url: String
    }

    input PartType {
        etag: String!
        PartNumber: Int!
    }

    type Result {
        status: Int
    }

    type loginResponse {
        token: String
        name: String
    }

    type allUser {
        id: String
        user: String
    }

    type paginationType {
        messages: [Message]
        totalPage: Int!
        nextPageNumber: Int!
    }

    type showStatusType {
        to: String!
        isActive: Boolean!
    }

    type isTypingType {
        id: String!
        isTyping: Boolean!
    }

    type Group {
        user: ID!
        role: UserRole!
    }

    type groupType {
        groupName: String!
        creator: ID!
        users: [Group!]!
    }

    type Query {
        messages: [Message]
        showUserMessage(sender: String!): [Message]
        login(email: String!, password: String!): loginResponse
        startMultipart(fileName: String!, contentType: String!): String
        generateMultipart(fileName: String!, uploadId: String!, partNumbers: Int!): [String]
        curUser: [allUser]
        pagination(pageNumber: Int!, limit: Int!): paginationType
        decrypt(encryptedText: String!, sender: Boolean!): String!
        search(searchText: String!): [User!]
        searchAuto(searchText: String!): [User!]
        status: String
        typingStatus(isTyping: Boolean!, to: String!): String
        showGroupMessages(groupId: String!): [Message]
    }

    type Mutation {
        register(userName: String!, email: String!, password: String!): User
        sendMessage(to: ID!, message: String, file: Upload): String
        complete(fileName: String!, uploadId: String!, parts: [PartType!]!, to: String!): String
        createGroup(groupName: String!, ids: [String!]! ): groupType
        deleteGroup(groupId: String!): groupType
        addUser(groupId: ID!, userId: ID!): groupType
        sendGroupMessage(groupId: ID!, message: String, file: Upload): String
    }

    type Subscription {
        showMessages(tokenId: String!): Message
        showUsersMessages(tokenId: String!, userId: String!): Message
        showStatus: [showStatusType!]
        isTyping(tokenId: String!, userId: String!): isTypingType
    }

`;

export default typeDefs;
