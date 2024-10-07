import fs from 'fs'
import { builder, Handler } from '@netlify/functions'
import { formatDistance } from 'date-fns'
import satori, { SatoriOptions } from 'satori'
import sharp from 'sharp'

const roboto = fs.readFileSync('./netlify/lib/Roboto-Regular.ttf')
const robotoBold = fs.readFileSync('./netlify/lib/Roboto-Bold.ttf')

const stacksColor = {
  light: '#636C74',
  medium: '#3B4045',
  dark: '#0C0D0E',
  orange400: '#E7700D',
  green400: '#18864B',
  white: '#FFFFFF',
  black150: '#f1f2f3',
}

const stringFormatter = new Intl.NumberFormat('en-US', {
  notation: 'compact',
  compactDisplay: 'short',
})

const decodeEntities = (encodedString: string) =>
  encodedString
    .replace(/&#(\d+);/g, (_match, dec) => String.fromCharCode(dec))
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')

const myHandler: Handler = async (event, _context) => {
  const path = event.path.replace(/\/+$/, '') // Remove trailing slash if present
  const params = path?.split('/').slice(-1)
  const id = params[0]

  console.log(id)

  const stackQuestionRaw = await fetch(`https://api.stackexchange.com/2.3/questions/${id}?site=stackoverflow`)
  const stackQuestion = (await stackQuestionRaw.json()).items[0]

  console.log(stackQuestion)

  let options: SatoriOptions = {
    //debug: true,
    width: 1200,
    height: 630,
    fonts: [
      {
        name: 'Roboto',
        data: roboto,
        weight: 400,
        style: 'normal',
      },
      {
        name: 'Roboto Bold',
        data: robotoBold,
        weight: 700,
        style: 'normal',
      },
    ]
  }
  
  const svg = await satori(
    {
      type: 'div',
      props: {
        children: [
          {
            type: 'div',
            props: {
              children: [
                {
                  type: 'span',
                  props: {
                    children: stringFormatter.format(stackQuestion.score).toLowerCase() + ' vote' + (stackQuestion.score !== 1 ? 's' : ''),
                    style: {
                      fontSize: '24px',
                      color: stacksColor.dark,
                      marginRight: '12px',
                    }
                  }
                },
                {
                  type: 'span',
                  props: {
                    children: stringFormatter.format(stackQuestion.answer_count).toLowerCase() + ' answer' + (stackQuestion.answer_count !== 1 ? 's' : ''),
                    style: {
                      fontSize: '24px',
                      color: stackQuestion.is_answered ? stacksColor.white : stacksColor.green400,
                      backgroundColor: stackQuestion.is_answered ? stacksColor.green400 : stacksColor.white,
                      marginRight: '12px',
                      padding: '6px 8px',
                      borderRadius: '6px',
                      border: `1px solid ${stacksColor.green400}`
                    }
                  },
                },
                {
                  type: 'span',
                  props: {
                    children: stringFormatter.format(stackQuestion.view_count).toLowerCase() + ' view' + (stackQuestion.view_count !== 1 ? 's' : ''),
                    style: {
                      fontSize: '24px',
                      color: stacksColor.medium,
                      marginRight: 'auto',
                    }
                  },
                },
                {
                  type: 'img',
                  props: {
                    src: 'https://d15k2d11r6t6rl.cloudfront.net/public/users/Integrators/669d5713-9b6a-46bb-bd7e-c542cff6dd6a/3603a3d8f3104ca5bd7015a5845f7fb7/logo-stack-overflow.png',
                    height: '62',
                  }
                }
              ],
              style: {
                display: 'flex',
                alignItems: 'center',
                marginBottom: '32px',
                paddingBottom: '24px',
                borderBottom: '1px solid #E3E5E8',
              }
            }
          },
          {
            type: 'div',
            props: {
              children: decodeEntities(stackQuestion.title),
              style: {
                fontSize: '60px',
                lineHeight: '100%',
                marginBottom: '32px',
                paddingRight: '32px',
                color: stacksColor.medium,
              }
            }
          },
          {
            type: 'div',
            props: {
              children: [
                ...stackQuestion.tags.map((tag: string) => (
                  {
                    type: 'span',
                    props: {
                      children: tag,
                      style: {
                        fontSize: '24px',
                        fontFamily: 'Roboto Bold',
                        padding: '6px 8px',
                        borderRadius: '6px',
                        backgroundColor: stacksColor.black150,
                        color: stacksColor.medium,
                        marginRight: '8px',
                      }
                    }
                  }
                )),
                {
                  type: 'img',
                  props: {
                    src: stackQuestion.owner.profile_image.replace('?s=256', '?s=60'),
                    width: '30',
                    height: '30',
                    style: {
                      borderRadius: '4px',
                      marginRight: '12px',
                      marginLeft: 'auto',
                    }
                  },
                },
                {
                  type: 'span',
                  props: {
                    children: stackQuestion.owner?.display_name,
                    style: {
                      fontSize: '22px',
                      color: '#0077CC',
                    }
                  },
                },
                {
                  type: 'span',
                  props: {
                    children: stringFormatter.format(stackQuestion.owner?.reputation).toLowerCase(),
                    style: {
                      fontFamily: 'Roboto Bold',
                      fontSize: '22px',
                      color: stacksColor.dark,
                      marginLeft: '8px',
                    }
                  },
                },
                {
                  type: 'span',
                  props: {
                    children: 'asked ' + formatDistance(
                        new Date(stackQuestion.creation_date * 1000),
                        new Date(),
                      { addSuffix: true }
                    ),
                    style: {
                      fontSize: '22px',
                      color: stacksColor.light,
                      marginLeft: '8px',
                    }
                  },
                },
              ],
              style: {
                display: 'flex',
                marginTop: 'auto',
                alignItems: 'center',
              }
            }
          },
        ],
        style: {
          display: 'flex',
          backgroundColor: '#FFFFFF',
          height: '100%',
          width: '100%',
          flexDirection: 'column',
          padding: '48px 64px 64px 64px',
          borderTop: `6px solid ${stacksColor.orange400}`
        },
      },
    },
    options
  )
  
  // Make a PNG
  const png = await sharp(Buffer.from(svg))
    .resize({ width: 1200 })
    .png()
    .toBuffer()

  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'image/png',
      'Cache-Control': 'public, max-age=86400',
      'Access-Control-Allow-Origin': '*',
    },
    body: png.toString('base64'),
    isBase64Encoded: true,
  }
}

const handler = builder(myHandler)

export { handler }