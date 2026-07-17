import {
  ConversionEventValues,
  ConversionTypeValues,
  DecisionTypeValues,
  JourneySourceValues,
  JourneyStageValues,
  LeadIntentValues,
  LeadScoreBandValues,
} from '../leads/lead-model.js';

const leadIntentValues = [
  ...new Set([
    ...LeadIntentValues.CONTACT,
    ...LeadIntentValues.CONSULTATION,
    ...LeadIntentValues.HOME_VALUE,
  ]),
];

export function getOpenApiYaml() {
  return `openapi: 3.0.1
info:
  title: Homes by RCG API
  version: 0.1.0
  description: Browser-facing lead intake contract for Homes by RCG.
servers:
  - url: https://api.homesbyrcg.com
paths:
  /health:
    get:
      summary: Health check
      responses:
        "200":
          description: Healthy service response
  /openapi.yaml:
    get:
      summary: OpenAPI contract
      responses:
        "200":
          description: OpenAPI YAML document
  /contact:
    options:
      summary: CORS preflight
      responses:
        "204":
          description: Preflight accepted
    post:
      summary: Submit a contact lead
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: "#/components/schemas/ContactRequest"
      responses:
        "202":
          description: Lead accepted
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/LeadAcceptedResponse"
        "400":
          description: Malformed request
        "422":
          description: Field validation failed
        "500":
          description: Internal server error
  /consultation:
    options:
      summary: CORS preflight
      responses:
        "204":
          description: Preflight accepted
    post:
      summary: Submit a consultation lead
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: "#/components/schemas/ConsultationRequest"
      responses:
        "202":
          description: Lead accepted
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/LeadAcceptedResponse"
        "400":
          description: Malformed request
        "422":
          description: Field validation failed
        "500":
          description: Internal server error
  /home-value:
    options:
      summary: CORS preflight
      responses:
        "204":
          description: Preflight accepted
    post:
      summary: Submit a home value lead
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: "#/components/schemas/HomeValueRequest"
      responses:
        "202":
          description: Lead accepted
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/LeadAcceptedResponse"
        "400":
          description: Malformed request
        "422":
          description: Field validation failed
        "500":
          description: Internal server error
components:
  schemas:
    ApiEnvelope:
      type: object
      required: [success, message, data, errors, requestId, correlationId, timestamp]
      properties:
        success:
          type: boolean
        message:
          type: string
        data:
          type: object
        errors:
          type: array
          items:
            $ref: "#/components/schemas/ApiError"
        requestId:
          type: string
        correlationId:
          type: string
        timestamp:
          type: string
          format: date-time
    ApiError:
      type: object
      properties:
        code:
          type: string
        field:
          type: string
        message:
          type: string
    LeadAcceptedResponse:
      type: object
      required: [success, message, leadId, status, requestId, correlationId, timestamp]
      properties:
        success:
          type: boolean
          enum: [true]
        message:
          type: string
        leadId:
          type: string
        status:
          type: string
          enum: [RECEIVED, PROCESSING, EMAILED, CRM_SYNCED, FOLLOW_UP, CLOSED]
        requestId:
          type: string
        correlationId:
          type: string
        timestamp:
          type: string
          format: date-time
    LeadInput:
      type: object
      additionalProperties: true
      properties:
        name:
          type: string
          maxLength: 200
        firstName:
          type: string
          maxLength: 80
        lastName:
          type: string
          maxLength: 80
        email:
          type: string
          format: email
          maxLength: 254
        phone:
          type: string
          maxLength: 30
        message:
          type: string
          maxLength: 4000
        notes:
          type: string
          maxLength: 4000
        currentPage:
          type: string
          maxLength: 2048
        referringPage:
          type: string
          maxLength: 2048
        journeySource:
          type: string
          enum: ${yamlInlineArray(JourneySourceValues)}
        journeyStage:
          type: string
          enum: ${yamlInlineArray(JourneyStageValues)}
        leadIntent:
          type: string
          enum: ${yamlInlineArray(leadIntentValues)}
        leadScore:
          type: number
          minimum: 0
          maximum: 100
        leadScoreBand:
          type: string
          enum: ${yamlInlineArray(LeadScoreBandValues)}
        leadScoreReasons:
          type: array
          maxItems: 20
          items:
            type: object
            additionalProperties: true
        leadContext:
          type: object
          additionalProperties: true
        journeyTimeline:
          type: array
          maxItems: 50
          items:
            type: object
            additionalProperties: true
        recommendedFollowUp:
          type: string
          maxLength: 2000
        conversionType:
          type: string
          enum: ${yamlInlineArray(ConversionTypeValues)}
        conversionEvent:
          type: string
          enum: ${yamlInlineArray(ConversionEventValues)}
        decisionType:
          type: string
          enum: ${yamlInlineArray(DecisionTypeValues)}
        campaign:
          type: string
          maxLength: 240
        referral:
          type: string
          maxLength: 500
        lead:
          type: object
          additionalProperties: true
    ContactRequest:
      allOf:
        - $ref: "#/components/schemas/LeadInput"
        - type: object
          anyOf:
            - required: [name, email, message]
            - required: [firstName, email, message]
    ConsultationRequest:
      allOf:
        - $ref: "#/components/schemas/LeadInput"
        - type: object
          anyOf:
            - required: [name, email, message]
            - required: [firstName, email, notes]
          properties:
            intent:
              type: string
              enum: [schedule-consultation, contact-request, decision-assessment-complete]
            consultationType:
              type: string
              enum: [buying, selling, investment, relocation, housing-guidance, decision-assessment, contact-request]
            preferredContactMethod:
              type: string
              enum: [phone, email, text]
            timeframe:
              type: string
              enum: [immediate, 30-days, 60-days, 90-days, exploring, not-specified]
    HomeValueRequest:
      allOf:
        - $ref: "#/components/schemas/LeadInput"
        - type: object
          anyOf:
            - required: [name, email, message]
            - required: [firstName, email, notes]
          properties:
            propertyAddress:
              type: string
              maxLength: 240
            city:
              type: string
              maxLength: 120
            state:
              type: string
              minLength: 2
              maxLength: 2
            zipCode:
              type: string
              minLength: 5
              maxLength: 10
            propertyType:
              type: string
              enum: [single-family, condo, townhome, multi-family, land, residential]
`;
}

function yamlInlineArray(values) {
  return `[${values.map((value) => JSON.stringify(value)).join(', ')}]`;
}
