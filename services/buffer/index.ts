import axios from "axios";

const BUFFER_API_URL = "https://api.buffer.com";

interface GraphQLResponse<T> {
  data: T;
  errors?: { message: string }[];
}

async function gql<T>(query: string): Promise<T> {
  const { data } = await axios.post<GraphQLResponse<T>>(
    BUFFER_API_URL,
    { query },
    {
      headers: {
        Authorization: `Bearer ${process.env.BUFFER_API_KEY!}`,
      },
    }
  );

  if (data.errors?.length) {
    throw new Error(`Buffer API error: ${data.errors[0].message}`);
  }

  return data.data;
}

export interface BufferSentPost {
  id: string;
  text: string;
  createdAt: string;
  dueAt: string | null;
  channelId: string;
}

interface GetSentPostsResponse {
  posts: {
    edges: { node: BufferSentPost }[];
  };
}

export async function getSentPosts(
  organizationId: string,
  channelId: string,
  since: string
): Promise<BufferSentPost[]> {
  const { posts } = await gql<GetSentPostsResponse>(
    `query GetSentPosts {
      posts(
        first: 50,
        input: { organizationId: "${organizationId}", filter: { status: [sent], channelIds: ["${channelId}"], dueAt: { start: "${since}" } } }
      ) {
        pageInfo {
          hasNextPage
          endCursor
        }
        edges {
          node {
            id
            text
            createdAt
            dueAt
            channelId
          }
        }
      }
    }`
  );

  return posts.edges.map((edge) => edge.node);
}