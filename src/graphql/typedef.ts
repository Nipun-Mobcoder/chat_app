const typeDefs = `

    scalar Upload
    
    scalar JSON

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
        date: String
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
        email: String
        phoneNumber: Float
    }

    type allUser {
        id: String
        user: String
        cur: Boolean
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

    type Order {
        amount: Int!
        id: ID!
        currency: String!
        status: String!
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
    }

    type Mutation {
        register(userName: String!, email: String!, password: String!, isAdmin: Boolean, address: JSON, phoneNumber: Int): User
        sendMessage(to: ID!, message: String, file: Upload): String
        complete(fileName: String!, uploadId: String!, parts: [PartType!]!, to: String!): String
        createGroup(groupName: String!, ids: [String!]! ): groupType
        deleteGroup(groupId: String!): groupType
        addUser(groupId: ID!, userId: ID!): groupType
        createOrder(amount: String!, currency: String!, to: String!): Order!
        verifyPayment(razorpayOrderId: String!, razorpayPaymentId: String!, razorpaySignature: String!, to: String!): String! 
        paymentFailure(paymentOrderId: String!): String
    }

    type Subscription {
        showMessages(tokenId: String!): Message
        showUsersMessages(tokenId: String!, userId: String!): Message
        showStatus: [showStatusType!]
        isTyping(tokenId: String!, userId: String!): isTypingType
    }

`;

export default typeDefs;
