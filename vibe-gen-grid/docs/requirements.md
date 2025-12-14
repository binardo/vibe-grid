# Requirements Document

## Introduction

This document specifies the functional requirements for a **Generative Grid** web application.

The app presents a spreadsheet-like grid where:
- **Rows** represent **companies/stocks**.
- **Columns** represent **prompt configurations** (prompt + tools + model + execution mode).
- Each **cell** runs an LLM call (OpenAI Responses API) using the column configuration and row/company context.
- Cell outputs stream into the UI and can be viewed in a full-page detail view with metadata.


### Non-goals / out of scope (explicit)
- Offline Batch scheduling execution of cells is **not required** for the POC; only the **UI to configure** schedule/trigger settings is required.
- Persistence of grids, columns, prompts, row order, and outputs are out of scope for POC, call dummy endpoints for these but no actual saving or loading of these, the data will only live in the UI state for now.
- users will be authenticated through orgs standard approach, for the PoC just assume a joe blogs users is authenticated

## Requirements

### Requirement 1: Grid library (multiple grids)

**User Story:** As a user, I want to view, create, and rename multiple generative grids, so that I can organize different analyses.

#### Acceptance Criteria
1. WHEN the user navigates to the grid library page THEN the system SHALL display a list of the user’s grids. 
2. WHEN the user creates a new grid THEN the system SHALL assign a default name in the format `grid 1`, `grid 2`, … (incrementing) unless the user sets a name. 
3. WHEN the user renames a grid THEN the system SHALL update the displayed grid name. 
4. WHEN the user clicks the **plus** button to create a new grid THEN the system SHALL navigate the user directly to the grid screen for that new grid. 
5. WHEN a grid has schedule/regeneration settings configured THEN the system SHALL display that configuration in the grid library and/or grid settings UI
6. WHEN a grid has schedule/regeneration settings configured THEN the system SHALL show a "..." button on each row with options to "Open", "Schedule", "Delete".
7. WHEN select "Schedule" on a a grid record a popup SHALL be displayed



### Requirement 2: Grid screen layout and basic table UX

**User Story:** As a user, I want a grid UI that keeps key headers visible, so that I can understand what I’m reading while scrolling.

#### Acceptance Criteria
1. WHEN the user is on the grid screen THEN the system SHALL show a left-hand column/panel for stocks (row sources). 
2. WHEN the user scrolls the grid THEN the system SHALL keep the header row (column names) frozen. 
3. WHEN the user scrolls the grid THEN the system SHALL keep the company name column frozen. 
4. WHEN the grid has no prompt columns yet THEN the system SHALL show a **plus** button to add the first column. 
5. WHEN the screen is shown THEN the system SHALL show a compact header area with
- app logo and name on the left 
- a search box for finding stocks, strategies or watchlists to add to the companies list to the right of the logo/name
- and a pause grid button in the top right
6. WHEN the Pause Grid button is clicked THEN the system SHALL cancel all running LLM calls and return them to queued status & pause button will become a go button.
7. WHEN the grid is paused THEN the system SHALL only queue but not execute further LLM calls until go button clicked to re-enable LLM calls. 

### Requirement 3: Strategy/watchlist/company resolution and adding rows

**User Story:** As a user, I want to add one company or many companies (from a watchlist or strategy) into the grid, so that I can run prompts across them.

#### Acceptance Criteria
1. WHEN the grid screen loads THEN the system SHALL call a **get all strategies** endpoint to retrieve strategies. 
2. WHEN the grid screen loads THEN the system SHALL load the user’s single watchlist named `watchlist`. 
3. WHEN strategies are loaded THEN the system SHALL cache the strategies list for fast strategy resolution during the session. 
4. WHEN the user types in the stock/strategy/watchlist selection textbox AND the user pauses briefly (debounce duration 0.5s) THEN the system SHALL call a **companies list** endpoint and retrieve the top 6 matching companies. 
5. WHEN the user types in the selection textbox THEN the system SHALL also add up to 4 strategy or watchlist name results sourced from local text search over (a) cached strategies and (b) the watchlist. 
6. WHEN the user selects a **single company** option THEN the system SHALL add that company as a new row in the grid. 
7. WHEN the user selects a **watchlist** option THEN the system SHALL show a spinner and call an API to fetch watchlist holdings, and WHEN holdings are received THEN the system SHALL add all holdings as rows. 
8. WHEN the user selects a **strategy** option THEN the system SHALL show a spinner and call an API to fetch strategy holdings, and WHEN holdings are received THEN the system SHALL add all holdings as rows. 
9. WHEN a set of multiple holdings is added (watchlist or strategy) THEN the system SHALL insert the newly added rows at the **top of the grid** ordered **alphabetically** by company short name. 
10. WHEN a single company is added THEN the system SHALL insert that row at the **top of the grid** 
11. WHEN a company row is displayed THEN the system SHALL show the company **short name** in the company name column. 
12. WHEN a company row is displayed THEN the system SHALL show an **info icon** to the right of the stock name, and WHEN the user hovers it THEN the system SHALL display stock metadata including at least **SEDOL** and **full name**. 
13. WHEN a company row is added to the grid that is already present THEN the existing row will just be moved to the position in the grid it would appear at if added, i.e. top if single stock or in order if list of stocks, it will retain any already calculated columns outputs.

### Requirement 4: Company row reordering and row actions menu

**User Story:** As a user, I want to reorder company rows and run row-level actions, so that I can prioritize analysis and manage execution for specific companies.

#### Acceptance Criteria
1. WHEN a company row is displayed THEN the system SHALL show a row handle button/icon on the right side of the company cell using a **6-dot (2×3) handle icon** (Notion-like). 
2. WHEN the user click-and-holds (presses and drags) the handle THEN the system SHALL allow the user to drag the company row to a new position in the grid. 
3. WHEN the user drops the dragged row THEN the system SHALL update the row ordering in the UI. 
4. WHEN the user clicks (without dragging) the handle icon THEN the system SHALL open a row actions menu containing:
   - Recalculate cells (for that company)
   - Recalculate empty cells (for that company)
   - Delete company (remove the row)
5. WHEN the user selects **Delete company** THEN the system SHALL remove that company row from the grid AND cancel any queued or in-progress cell processing for that row. 
6. WHEN the user selects **Recalculate cells** for a company THEN the system SHALL (re)run cell processing for that company across all columns (respecting concurrency limits & cell calculation dependency order). 
7. WHEN the user selects **Recalculate empty cells** for a company THEN the system SHALL run cell processing only for cells that are empty for that company (respecting concurrency limits & cell calculation dependency order).

### Requirement 5: Prompt columns (create, edit, delete)

**User Story:** As a user, I want to define prompt columns with tools and model settings, so that I can generate structured outputs per company.

#### Acceptance Criteria
1. WHEN the user clicks the column **plus** button THEN the system SHALL create a new prompt column and open the column configuration form. 
2. WHEN a column is collapsed THEN the system SHALL show only the column name in the header. 
3. WHEN a column is expanded for editing/creation THEN the system SHALL show a full-screen form that includes:
   - Name (optional; auto-generated if not set)
   - Prompt (large multiline text area)
   - Tool pills area + button to add tools
   - Model dropdown
   - Toggle for auto-run vs on-demand
4. WHEN the user does not set a column name THEN the system SHALL auto-generate a name on save of form from prompt via LLM as a background task and update the column in Ui when response received, as long as column still default name. 
5. WHEN the user adds a tool THEN the system SHALL support at least the following tool types:
   - Web search
   - Latest filing
   - Latest earnings call
   - Latest broker reports
   - Upload a file (as a tool)
6. WHEN the user opens the model dropdown THEN the system SHALL offer:
   - `gpt-5-nano` (minimal / low / medium / high)
   - `gpt-5-mini` (minimal / low / medium / high)
   - `gpt-5.2` (minimal / low / medium / high)
   - `o4-mini-deep-research`
7. WHEN a new column is created THEN the system SHALL default the model selection to `gpt-5-nano low`. 
8. WHEN the user saves the column configuration THEN the system SHALL persist the configuration for use in cell execution, dummied endpoint for now but maintained in UI state. 
9. WHEN the user opens the column header menu (`…`) THEN the system SHALL offer: calculate all cells, calculate empty cells, edit, re-order and delete. 
10. WHEN the user deletes a column THEN the system SHALL remove the column AND cancel any queued or in-progress cell processing for that column.
10. WHEN the user re-orders a column THEN the user SHALL be able to drag the column to the right or as far to the left as prior cell dependencies in prompt allow to be valid

### Requirement 6: Dynamic content insertion into prompts

**User Story:** As a user, I want to insert dynamic company/context variables into prompts, so that I can template prompts without manual copying.

#### Acceptance Criteria
1. WHEN the user is editing a column prompt THEN the system SHALL provide a UI control to add dynamic content tokens/pills into the prompt text area. 
2. WHEN the user opens the dynamic content selector THEN the system SHALL offer token options including (as listed in notes):
   - Company name
   - SEDOL
   - Forward Looking Hypothesis (only offered if company added as strategy or watchlist stock)
   - Company fundamentals
   - Latest earnings call
   - Latest earnings call date
   - Latest filing date
   - Latest filing summary
   - Latest broker reports
3. WHEN the user is editing a prompt for a column to the right of other columns THEN the system SHALL include options to reference outputs of prior cells for the same company, using the prior columns’ names (e.g., “Cell output of Column 1 (name)”). 
4. WHEN a dynamic token is inserted THEN the system SHALL render it as a pill within the prompt text area. 
5. WHEN the user drags a token pill THEN the system SHALL allow reordering the pill position within the prompt. 
6. WHEN the user deletes a token pill THEN the system SHALL remove it from the prompt. 

### Requirement 7: Cell execution (auto-run / on-demand), streaming, and concurrency

**User Story:** As a user, I want cell generation to run concurrently with clear queued/loading states and streaming output, so that I can get results quickly and understand progress.

#### Acceptance Criteria
1. WHEN a column configuration is saved AND the column is set to **auto-run** THEN the system SHALL start an LLM call for each company row in that column. 
2. WHEN LLM calls are running THEN the system SHALL stream cell responses into their corresponding cells as output becomes available. 
3. WHEN LLM calls are running THEN the system SHALL show a spinner in each cell while that cell’s call is in progress. 
4. WHEN the system is at the concurrency limit THEN the system SHALL place additional cell executions in a queued state and display a queued indicator/message instead of a loading spinner. 
5. WHEN concurrency capacity becomes available THEN the system SHALL automatically transition queued cells to in-progress (spinner) and start execution. 
6. WHEN executing cells THEN the system SHALL limit concurrent in-flight LLM calls to **5**. 
7. WHEN a new company row (or multiple rows) is added THEN the system SHALL compute all applicable cells across columns in order **top-to-bottom, left-to-right**, while respecting concurrency limits. 
8. WHEN a cell’s prompt references outputs of prior cells for the same company THEN the system SHALL NOT start that cell until the required prior outputs exist, and SHALL keep it in queued state until dependencies are satisfied. 
9. WHEN the user deletes a company row THEN the system SHALL cancel any queued or in-progress cell processing for that row. 
10. WHEN the user deletes a column THEN the system SHALL cancel any queued or in-progress cell processing for that column. 
11. WHEN the user triggers “calculate all cells” or “calculate empty cells” from a column menu THEN the system SHALL enqueue the relevant cells for execution respecting the concurrency and dependency rules. 

### Requirement 8: Cell rendering in the grid and cell detail viewer

**User Story:** As a user, I want compact cell previews with an expandable detailed view, so that I can scan results quickly and drill into specifics.

#### Acceptance Criteria
1. WHEN a cell has output THEN the system SHALL render up to **3 lines** of the response in the grid cell. 
2. WHEN a cell response exceeds 3 lines THEN the system SHALL truncate the preview and display an ellipsis (`…`). 
3. WHEN a cell is streaming output THEN the system SHALL show a spinner in the bottom-right of the cell. 
4. WHEN the user clicks a cell THEN the system SHALL open a full-page viewer for that cell. 
5. WHEN the cell viewer is open THEN the system SHALL show tabs for:
   - Output
   - Rendered input prompt
   - Metadata
6. WHEN the cell viewer shows metadata THEN it SHALL include at least: model used, latest call tokens in/out, date time, call cost, tools used and execution count. 
7. WHEN a cell is streaming AND the user opens the cell viewer THEN the system SHALL continue streaming content into the output tab. 
8. WHEN output or input prompt is displayed (grid cell viewer) THEN the system SHALL provide a copy button for output and a copy button for the rendered input prompt. 
9. WHEN a cell LLM call fails THEN the cell SHALL show a failed message with a hover over for details of error status code, message

### Requirement 9: Aggregation prompts per column

**User Story:** As a user, I want to add an aggregation prompt per column, so that I can summarize or synthesize the column’s results.

#### Acceptance Criteria
1. WHEN the user scrolls past the bottom row THEN the system SHALL display a button for each column to add an aggregation prompt (placement: “beyond the bottom of the bottom row”). 
2. WHEN the user clicks the aggregation prompt button for a column THEN the system SHALL open a prompt entry form similar to a column prompt form. 
3. WHEN editing an aggregation prompt THEN the system SHALL allow dynamic content insertion for column results (format as # Column name =======<cell 1 output>=======<cell 2 output>…=======) and allow adding surrounding prompt text. 
4. WHEN the user saves an aggregation prompt THEN the system SHALL store it for that column it will appear as an additional prompt cell below that column and there will be another cell for the aggregation prompt output below the aggregating prompt cell for that column
5. WHEN the aggregation prompt is saved THEN the execution of that output cell will be queued respecting concurrency and ordering, i.e. all input column cells needed to calculate it.
6. WHEN a new company row is added and the aggregation prompt is Auto-run THEN the aggregation prompt execution will be queued.

### Requirement 10: Regeneration triggers configuration (UI-only POC)

**User Story:** As a user, I want to configure regeneration triggers for a grid, so that it can be refreshed automatically based on time or new source data.

#### Acceptance Criteria
1. WHEN the user views grid scheduling popup THEN the system SHALL allow configuring a regeneration trigger based on date/recurrence (e.g., daily at 7am). 
2. WHEN the user configures a “new source data” scheduling trigger THEN the system SHALL allow selecting triggers such as new filing and/or new earnings call. 
3. WHEN the user configures a scheduling trigger based on filing or earnings call THEN the UI SHALL indicate that only rows for companies with new filings/calls would be regenerated. 
4. WHILE implementing this POC THEN the system SHALL provide the UI to configure these settings WITHOUT requiring backend scheduling/batch execution to be implemented. 

### Requirement 11: LLM and supporting services integration (real + dummy)

**User Story:** As a developer/tester, I want the UI to run against real services when configured, or dummy services when not, so that I can retest the UI reliably.

#### Acceptance Criteria
1. WHEN the app executes an LLM call for a cell THEN the system SHALL call the OpenAI **Responses API**, passing prompt, model, effort level and tools as configured for that cell. 
2. WHEN the OpenAI API key is required THEN the system SHALL read it from the environment variable `OPENAI_API_KEY`. 
3. WHEN the company/strategy/watchlist resolution services have configurable host URL and API key THEN the system SHALL use those settings for API calls by sending "x-api-key" header. 
4. IF the company/strategy/watchlist resolution services are not configured THEN the system SHALL use dummy API implementations with dummy responses to allow retesting the UI. 
5. WHEN the UI calls the stock list (companies list) endpoint THEN the system SHALL show an appropriate loading indicator/spinner while results are loading. 



## Diagrams

### Cell state flow

flowchart LR
  A[Idle]
  B[Queued]
  C[Running]
  D[Streaming]
  E[Complete]
  F[Error]
  G[Cancelled]

  A --> B
  B --> C
  C --> D
  D --> D
  C --> E
  D --> E
  C --> F
  D --> F
  A --> G
  B --> G
  C --> G
  D --> G

### Architecture

flowchart LR
  A[Browser]
  B[Grid UI]
  C[Scheduler]
  D[Backend]
  E[Company API]
  G[OpenAI Responses]
  H[Storage]

  A --> B
  B --> D
  C --> D
  D --> E
  D --> G
  D --> H
  D --> B


## Example api calls

### Get Strategies list

curl -X 'GET' \
  'https://market-view-api-experimental-uat.apps.aks-d-cluster2-uks.azure.bgintdev.com/strategies' \
  -H 'accept: application/json' \
  -H 'accept-version: 1' \
  -H 'Authorization: Bearer ...'


Server response
{
  "message": [
    {
      "strategy_asset_type": "Global Equity - Equity",
      "strategy": "LTGG",
      "strategy_code": "LTGG",
      "main_representative_portfolio_icon_code": "DPERS",
      "portfolios": [...]
    },
    {
      "strategy_asset_type": "US Equity - Equity",
      "strategy": "US Growth",
      "strategy_code": "USEQUITY",
      "main_representative_portfolio_icon_code": "VANGUS",
      "portfolios": [...]
    },
    {
      "strategy_asset_type": "Global Equity - Equity",
      "strategy": "Global Alpha",
      "strategy_code": "GLOBALALPHA",
      "main_representative_portfolio_icon_code": "VANGLOB",
      "portfolios": [...]
    },
    {
      "strategy_asset_type": "Japan - Equity",
      "strategy": "Japan Growth",
      "strategy_code": "JAPANGROWTH",
      "main_representative_portfolio_icon_code": "WFJAP",
      "portfolios": [...]
    },
    {
      "strategy_asset_type": "Global Equity - Equity",
      "strategy": "Positive Change",
      "strategy_code": "Positive Change",
      "main_representative_portfolio_icon_code": "OCPOSITIVE",
      "portfolios": [...]
    }
  ]
} 



### Get Stock from partial name

curl -X 'GET' \
  'https://market-view-api-experimental-uat.apps.aks-d-cluster2-uks.azure.bgintdev.com/stocks/universe?limit=10&search=appl' \
  -H 'accept: application/json' \
  -H 'accept-version: 1' \
  -H 'Authorization: Bearer ...'

Response body
{
  "message": {
    "total_count": 37,
    "results": [
      {
        "sedol": "6021492",
        "company_name": "Aiphone Co.,Ltd.",
        "sector": "Electric Appliances",
        "industry": "Electric Appliances",
        "region": "Japanese",
        "country": "Japan"
      },
      {
        "sedol": "2046251",
        "company_name": "Apple",
        "sector": "Information Technology",
        "industry": "Technology Hardware, Storage & Peripherals",
        "region": "American",
        "country": "United States"
      },
      {
        "sedol": "BXRTX56",
        "company_name": "Apple Hospitality Reit",
        "sector": "Real Estate",
        "industry": "Hotel & Resort REITs",
        "region": "American",
        "country": "United States"
      }...
    ]
  }
}


### get strategy holdings

curl -X 'GET' \
  'https://market-view-api-experimental-uat.apps.aks-d-cluster2-uks.azure.bgintdev.com/investment-intelligence/portfolios/holdings?portfolio_identifier=INTALPHA&portfolio_identifier_type=strategy_code' \
  -H 'accept: application/json' \
  -H 'accept-version: 1' \
  -H 'Authorization: Bearer ...'

Response body

{
  ...
  "holdings": {
    ...
    "instrument_holdings": [
      {
        "sedol": "BLDBN41",
        "company_name": "Atlas Copco A",
        "country": "Sweden",
        "sector": "Industrials",
        "industry": "Machinery"
        ...
      },
      {
        "sedol": "BNKCF01",
        "company_name": "Lumine Group Inc",
        "country": "Canada",
        "sector": "Information Technology",
        "industry": "Software",
        ...
      },
      {
        "sedol": "BZ01RF1",
        "company_name": "Demant A/S",
        "country": "Denmark",
        "sector": "Health Care",
        "industry": "Health Care Equipment & Supplies",
        ...
      }
    ],
    ...
  }
}



### Get watchlist holdings

curl -X 'GET' \
  'https://market-view-api-experimental-uat.apps.aks-d-cluster2-uks.azure.bgintdev.com/investors/watchlist?watchlist_name=watchlist' \
  -H 'accept: application/json' \
  -H 'accept-version: 1' \
  -H 'Authorization: Bearer ...'

Response body

[
  {
    "sedol": "B29NF31",
    "company_name": "Franco-Nevada Corp",
    "country": "Canada",
    "sector": "Materials",
    "industry": "Metals & Mining"
  },
  {
    "sedol": "B01C1P6",
    "company_name": "Bank Central Asia",
    "country": "Indonesia",
    "sector": "Financials",
    "industry": "Banks"
  }
]

### Get Company Documents list

curl -X 'GET' \
  'https://market-view-api-dev.apps.aks-d-cluster2-uks.azure.bgintdev.com/companies/documents?company_identifier=2588173&company_identifier_type=sedol&start_date=2025-01-01&end_date=2025-12-31&limit=100' \
  -H 'accept: application/json' \
  -H 'accept-version: 1' \
  -H 'Authorization: Bearer … '

Response body

{
  "message": {
    "documents": [
      {
        "global_doc_id": "SE-16527020",
        "date": "2025-12-05T16:30:00",
        "title": "Edited Transcript of MSFT.OQ shareholder or annual meeting 5-Dec-25 4:30pm GMT",
        "rdc_org_id": 26589,
        "company_name": "Microsoft Corp",
        "category": "external",
        "type": "external_investor_calls",
        "subtype": "all_other_external_calls",
        "variant": "Shareholder Meeting",
        "filename": "SE-16527020.txt"
      },
      {
        "global_doc_id": "SE-16563134",
        "date": "2025-12-02T22:35:00",
        "title": "Edited Transcript of MSFT.OQ presentation 2-Dec-25 10:35pm GMT",
        "rdc_org_id": 26589,
        "company_name": "Microsoft Corp",
        "category": "external",
        "type": "external_investor_calls",
        "subtype": "all_other_external_calls",
        "variant": "Conference Presentation",
        "filename": "SE-16563134.txt"
      },
      {
        "global_doc_id": "RL-R443431",
        "date": "2025-11-13",
        "title": "Microsoft and Gaza meeting",
        "author": "Punit Desai",
        "snippet": "The document details a meeting regarding Microsoft's response to allegations that its technologies were used by the Israeli military in ways that violated internal policies. It outlines the discussions led by Steve Lippman, who provided insights into Microsoft's governance structures, human rights due diligence efforts, and the company's shift towards monitoring sensitive customers rather than just sensitive use cases. The meeting concluded with a sense of reassurance about Microsoft's commitment to integrity and human rights, despite acknowledging the unique reputational risks it faces compared to competitors.",
        "rdc_org_id": 26589,
        "company_name": "Microsoft Corp",
        "category": "internal",
        "type": "internal_investment_reports",
        "url": "https://library.bgs.com/Home/Open?id=R443431"
      },
      {
        "global_doc_id": "ER-112697515858",
        "date": "2025-10-30",
        "title": "Reports Good F1Q Results, But Capacity Constraint Weighs Down Azure and Cloud Services Revenue Growth; Raises Capex Guidance",
        "author": "Mr. Brian J. Schwartz",
        "snippet": "Microsoft's F1Q results beat consensus estimates. Azure and other Cloud Services revenue grew 39% in CC, which is strong growth at a large scale, but a slight decel from last quarter. Additionally, the F2Q guidance for this metric implies further deceleration despite an easier y/y comparison. The i",
        "rdc_org_id": 26589,
        "company_name": "Microsoft Corp",
        "category": "external",
        "type": "broker_research",
        "filename": "112697515858.pdf"
      },
      {
        "global_doc_id": "SE-16526988",
        "date": "2025-10-29T21:30:00",
        "title": "Edited Transcript of MSFT.OQ earnings conference call or presentation 29-Oct-25 9:30pm GMT",
        "rdc_org_id": 26589,
        "company_name": "Microsoft Corp",
        "category": "external",
        "type": "external_investor_calls",
        "subtype": "earnings_calls",
        "variant": "Earning Conference Call/Presentation",
        "filename": "SE-16526988.txt"
      },
      {
        "global_doc_id": "FI-85165693",
        "date": "2025-10-29",
        "title": "Microsoft Corp 10-Q",
        "rdc_org_id": 26589,
        "company_name": "Microsoft Corp",
        "category": "external",
        "type": "filing_documents",
        "subtype": "interim_report",
        "variant": "10-Q",
        "filing_statement_date": "2025-09-30",
        "filename": "85165693.pdf"
      },
      …
]}}



### get company document text


curl -X 'GET' \
  'https://market-view-api-dev.apps.aks-d-cluster2-uks.azure.bgintdev.com/companies/documents/FI-85165693' \
  -H 'accept: application/json' \
  -H 'accept-version: 1' \
  -H 'Authorization: Bearer ...'

Response body
{
  "global_doc_id": "FI-85165693",
  "title": "85165693.pdf",
  "category": "external",
  "type": "filing_documents",
  "pages": [
    {
      "page_no": 1,
      "text": "REFINITIV CORPORATE DISCLOSURES | www.refinitiv.com | Contact Us ©2025 Refinitiv. All rights reserved. Republication or redistribution of Refinitiv content, including by framing or similar means, is prohibited without the prior written consent of Refinitiv. 'Refinitiv' and the Refinitiv logo are registered trademarks of Refinitiv and its affiliated companies. 1/88 DELTA REPORT 10-Q MSFT - MICROSOFT CORP 10-Q - SEPTEMBER 30, 2025 COMPARED TO 10-Q - MARCH 31, 2025 TOTAL DELTAS 1356 CHANGES 237 DELETIONS 618 ADDITIONS 501 REFINITIV The following comparison report has been automatically generated"
    },
    {
      "page_no": 2,
      "text": "REFINITIV CORPORATE DISCLOSURES | www.refinitiv.com | Contact Us ©2025 Refinitiv. All rights reserved. Republication or redistribution of Refinitiv content, including by framing or similar means, is prohibited without the prior written consent of Refinitiv. 'Refinitiv' and the Refinitiv logo are registered trademarks of Refinitiv and its affiliated companies. 2/88 UNITED STATES SECURITIES AND EXCHANGE COMMISSION Washington, D.C. 20549 FORM 10-Q ☒ QUARTERLY REPORT PURSUANT TO SECTION 13 OR 15(d) OF THE SECURITIES EXCHANGE ACT OF 1934 For the Quarterly Period Ended March 31, September 30, 2025 OR ...
    },
    …
]
}
