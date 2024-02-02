
import { createClient } from '@supabase/supabase-js';
import { NextApiRequest } from 'next';
import { NextResponse } from 'next/server';

const client = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_ANON_KEY!
);

interface SupabaseRequest extends NextApiRequest { 
  body: {
    text: string;
    date: string;
  }
}

export default async function handler(request: SupabaseRequest) {
  if (request.method === "POST") {
    return client.from('tweets').insert([
      { text: request.body.text, publish_date: new Date(request.body.date + '-03:00') },
    ]).then(res => {
      return NextResponse.json(res);
    })
  }
}
