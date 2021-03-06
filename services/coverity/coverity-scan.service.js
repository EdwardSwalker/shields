'use strict'

const Joi = require('@hapi/joi')
const { BaseJsonService } = require('..')

const messageRegex = /passed|passed .* new defects|pending|failed/
const schema = Joi.object({
  message: Joi.string().regex(messageRegex).required(),
}).required()

module.exports = class CoverityScan extends BaseJsonService {
  static category = 'analysis'
  static route = { base: 'coverity/scan', pattern: ':projectId' }

  static examples = [
    {
      title: 'Coverity Scan',
      namedParams: {
        projectId: '3997',
      },
      staticPreview: this.render({
        message: 'passed',
      }),
    },
  ]

  static defaultBadgeData = { label: 'coverity' }

  static render({ message }) {
    let color
    if (message === 'passed') {
      color = 'brightgreen'
      message = 'passing'
    } else if (/^passed .* new defects$/.test(message)) {
      color = 'yellow'
    } else if (message === 'pending') {
      color = 'orange'
    } else {
      color = 'red'
    }

    return {
      message,
      color,
    }
  }

  async handle({ projectId }) {
    const url = `https://scan.coverity.com/projects/${projectId}/badge.json`
    const json = await this._requestJson({
      url,
      schema,
      options: {
        // Coverity has an issue in their certificate chain that requires
        // disabling the default strict SSL check in order to call their API.
        // For more information see:
        // https://github.com/badges/shields/issues/3334
        // https://github.com/badges/shields/pull/3336
        strictSSL: false,
      },
      errorMessages: {
        // At the moment Coverity returns an HTTP 200 with an HTML page
        // displaying the text 404 when project is not found.
        404: 'project not found',
      },
    })
    return this.constructor.render({ message: json.message })
  }
}
