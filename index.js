import { VercelRequest, VercelResponse } from '@vercel/node';
import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const LINE_ACCESS_TOKEN = process.env.LINE_ACCESS_TOKEN;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

export default async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' }); // 405エラーを防ぐ
  }

  console.log("Received a webhook event:", req.body);

  const events = req.body.events;
  if (!events) {
    return res.status(400).json({ error: 'Invalid Request' });
  }

  for (const event of events) {
    if (event.type === 'message' && event.message.type === 'text') {
      const userMessage = event.message.text;
      const aiResponse = await getAIResponse(userMessage);
      await replyToUser(event.replyToken, aiResponse);
    }
  }

  res.status(200).send('OK'); // LINEに成功を返す
};

// ChatGPT APIで応答を生成
async function getAIResponse(userMessage) {
  try {
    const response = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: 'gpt-4',
        messages: [
          { role: 'system', content: 'あなたはShin Wadaの人格を持つAIです。' },
          { role: 'user', content: userMessage }
        ],
      },
      {
        headers: { Authorization: `Bearer ${OPENAI_API_KEY}` }
      }
    );
    return response.data.choices[0].message.content;
  } catch (error) {
    console.error('Error with OpenAI API:', error);
    return 'エラーが発生しました。もう一度試してください。';
  }
}

// LINEにメッセージを返信
async function replyToUser(replyToken, message) {
  try {
    await axios.post(
      'https://api.line.me/v2/bot/message/reply',
      {
        replyToken,
        messages: [{ type: 'text', text: message }]
      },
      {
        headers: {
          Authorization: `Bearer ${LINE_ACCESS_TOKEN}`,
          'Content-Type': 'application/json'
        }
      }
    );
  } catch (error) {
    console.error('Error sending message to LINE:', error);
  }
}
