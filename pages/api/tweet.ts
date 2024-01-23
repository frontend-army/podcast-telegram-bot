
import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const client = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_ANON_KEY!
);
export default async function handler(request: NextRequest, response: NextResponse) {
  if (request.method === "POST") {
    return client.from('tweets').insert([
      { text: request.body.text, publish_date: new Date(request.body.date + '+03:00') },
    ]).then(res => {
      return response.json(res);
    })
  }
}
