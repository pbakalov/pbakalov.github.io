#!/usr/bin/env python3
"""
Generate an HTML table from the extracted cases JSON
"""

import json
import sys
from pathlib import Path
from typing import List, Dict, Any

pdf_dir = 'https://pbakalov.github.io/assets/dela_kupen_vot/'
search_url = 'https://legalacts.justice.bg/'
twitter_url = 'https://twitter.com/petar_baka'

def load_cases(json_file: str) -> List[Dict[str, Any]]:
    """Load cases from JSON file"""
    with open(json_file, 'r', encoding='utf-8') as f:
        return json.load(f)

def escape_html(text: str) -> str:
    """Escape HTML special characters"""
    if text is None:
        return ""
    text = str(text)
    return (text.replace('&', '&amp;')
                .replace('<', '&lt;')
                .replace('>', '&gt;')
                .replace('"', '&quot;')
                .replace("'", '&#39;'))

def format_case_number(case_data: Dict[str, Any]) -> str:
    """Format case number with link to PDF"""
    file_path = case_data['file_path']
    case_num = case_data['case_number']['number']
    case_type = case_data['case_number']['type']
    year = case_data['case_number'].get('year', '')

    if year:
        case_display = f"{case_type} {case_num}/{year}"
    else:
        case_display = f"{case_type} №{case_num}"

    return f'<a href="{pdf_dir}{file_path}" target="_blank">{case_display}</a>'

def format_election(case_data: Dict[str, Any]) -> str:
    """Format election info"""
    election = case_data['election']
    election_type = election['type']
    year = election['year']
    return f"{election_type} {year}"

def format_accused(case_data: Dict[str, Any]) -> str:
    """Format accused information"""
    count = case_data['accused']['count']
    details_list = case_data['accused'].get('details', [])
    if not details_list:
        return f"{count} обвиняем"
    details = details_list[0]
    education = details.get('education', 'н.д.')
    occupation = details.get('occupation', 'н.д.')
    return f"{count} обвиняем<br><small>{education}, {occupation}</small>"

def format_vote_incentive(case_data: Dict[str, Any]) -> str:
    """Format vote incentive information"""
    incentive = case_data['vote_incentive']
    price = incentive['price_per_vote']
    description = incentive.get('description', '')

    if price == "в натура":
        return f"<strong>В натура</strong><br><small>{description}</small>"
    else:
        currency = incentive.get('currency', 'BGN')
        return f"<strong>{price} {currency}</strong>" + (f"<br><small>{description}</small>" if description else "")

def format_beneficiary(case_data: Dict[str, Any]) -> str:
    """Format beneficiary information"""
    beneficiary = case_data['beneficiary']
    party = beneficiary.get('party', 'н.д.')
    candidate = beneficiary.get('candidate', 'н.д.')
    position = beneficiary.get('position', 'н.д.')

    if candidate != "н.д." and candidate:
        return f"<strong>{party}</strong><br><small>{candidate}<br>{position}</small>"
    else:
        return f"<strong>{party}</strong>"

def format_location(case_data: Dict[str, Any]) -> str:
    """Format location"""
    location = case_data['location']
    if location == "н.д.":
        return location
    return escape_html(location)

def format_crime_date(case_data: Dict[str, Any]) -> str:
    """Format crime date"""
    crime_date = case_data.get('crime_date', 'н.д.')
    return escape_html(str(crime_date))

def format_penal_code(case_data: Dict[str, Any]) -> str:
    """Format penal code article"""
    article = case_data.get('penal_code_article', 'н.д.')
    return escape_html(str(article))

def format_verdict(case_data: Dict[str, Any]) -> str:
    """Format verdict and punishment"""
    verdict = case_data['verdict']
    punishment = case_data['punishment']
    return f"<strong>{verdict}</strong><br><small>{punishment}</small>"

def format_verdict_type(case_data: Dict[str, Any]) -> str:
    verdict_type = escape_html(case_data.get('verdict_type'))
    if verdict_type == 'споразумение':
        return verdict_type
    return ''

def generate_html_table(cases: List[Dict[str, Any]]) -> str:
    """Generate HTML table from cases"""
    total_cases = len(cases)
    html = f"""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Дела за купен вот (по чл. 167 от НК)</title>
    <style>
        body {{
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
            margin: 20px;
            background-color: #f5f5f5;
        }}
        h1 {{
            color: #333;
        }}
        table {{
            width: 100%;
            border-collapse: collapse;
            background-color: white;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }}
        th {{
            background-color: #2c3e50;
            color: white;
            padding: 12px;
            text-align: left;
            font-weight: 600;
            border-bottom: 2px solid #34495e;
        }}
        td {{
            padding: 12px;
            border-bottom: 1px solid #ddd;
            vertical-align: top;
        }}
        tr:hover {{
            background-color: #f9f9f9;
        }}
        a {{
            color: #0066cc;
            text-decoration: none;
        }}
        a:hover {{
            text-decoration: underline;
        }}
        small {{
            color: #666;
            display: block;
            margin-top: 4px;
            font-size: 0.85em;
        }}
        strong {{
            color: #2c3e50;
        }}
        .file-link {{
            font-weight: 600;
            color: #0066cc;
        }}
    </style>
</head>
<body>
    <h1>Дела за купен вот (по чл. 167 от НК) 2017 - 2023</h1>
    Справката тук съдържа съдебните решения достъпни през <a href='{search_url}'>търсачката за съдебни актове</a>. За коментари и намерени грешки: <a href='{twitter_url}'>petar_baka</a>.
    <p><strong>Общо:</strong> {total_cases}</p>
    <table>
        <thead>
            <tr>
                <th>Дело</th>
                <th>Дата на престъплението</th>
                <th>Дата на съдебното решение</th>
                <th>Съд</th>
                <th>член от НК</th>
                <th>Присъда</th>
                <th>Присъда бележки</th>
                <th>Вид избор</th>
                <th>Брой обвинени</th>
                <th>Цена на глас</th>
                <th>В полза на</th>
                <th>Место</th>
                <th>Брой продавачи</th>
            </tr>
        </thead>
        <tbody>
"""

    for case in cases:
        html += f"""        <tr>
            <td>{format_case_number(case)}</td>
            <td><small>{format_crime_date(case)}</small></td>
            <td>{escape_html(case['judgment_date'])}</td>
            <td><small>{escape_html(case['case_number']['court'])}</small></td>
            <td><small>{format_penal_code(case)}</small></td>
            <td>{format_verdict(case)}</td>
            <td><small>{format_verdict_type(case)}</small></td>
            <td>{format_election(case)}</td>
            <td>{format_accused(case)}</td>
            <td>{format_vote_incentive(case)}</td>
            <td>{format_beneficiary(case)}</td>
            <td>{format_location(case)}</td>
            <td><small>{escape_html(str(case['vote_sellers_mentioned']['count']))}</small></td>
        </tr>
"""

    html += """        </tbody>
    </table>
</body>
</html>
"""

    return html

def generate_markdown_table(cases: List[Dict[str, Any]]) -> str:
    """Generate Markdown table from cases"""
    md = "# Electoral Fraud Cases - Bulgaria 2017-2018 (All Cases)\n\n"
    md += f"**Total cases:** {len(cases)}\n\n"
    md += "| Case | Crime Date | Judgment Date | Court | Penal Code | Verdict Type | Election | Accused | Vote Incentive | Beneficiary | Location | Verdict |\n"
    md += "|------|------------|---------------|-------|-----------|--------------|----------|---------|----------------|-------------|----------|--------|\n"

    for case in cases:
        case_num = case['case_number']['number']
        case_type = case['case_number']['type']
        year = case['case_number'].get('year', '')
        if year:
            case_display = f"{case_type} {case_num}/{year}"
        else:
            case_display = f"{case_type} №{case_num}"
        case_link = f"[{case_display}]({case['file_path']})"
        crime_date = case.get('crime_date', 'н.д.')
        judgment_date = case['judgment_date']
        court = case['case_number']['court']
        penal_code = case.get('penal_code_article', 'н.д.')
        election = f"{case['election']['type']} {case['election']['year']}"

        accused_count = case['accused']['count']
        accused_details = case['accused'].get('details', [])
        accused_edu = accused_details[0].get('education', 'н.д.') if accused_details else 'н.д.'

        incentive = case['vote_incentive']['price_per_vote']
        if incentive == "в натура":
            incentive_text = "В натура"
        else:
            currency = case['vote_incentive'].get('currency', 'BGN')
            incentive_text = f"{incentive} {currency}"

        beneficiary = case['beneficiary'].get('party', 'н.д.')
        location = case['location']

        verdict = case['verdict']
        punishment = case['punishment']
        verdict_text = f"{verdict}: {punishment}"
        verdict_type = case.get('verdict_type', 'н.д.')

        md += f"| {case_link} | {crime_date} | {judgment_date} | {court} | {penal_code} | {verdict_type} | {election} | {accused_count} ({accused_edu}) | {incentive_text} | {beneficiary} | {location} | {verdict_text} |\n"

    return md

def main():
    json_file = "./nk167_cases.json"

    # Check if file exists
    if not Path(json_file).exists():
        print(f"Error: {json_file} not found")
        sys.exit(1)

    # Load cases
    cases = load_cases(json_file)
    print(f"Loaded {len(cases)} cases")

    # Generate HTML table
    html_output = "./nk167_cases.html"
    html_content = generate_html_table(cases)
    with open(html_output, 'w', encoding='utf-8') as f:
        f.write(html_content)
    print(f"HTML table saved to {html_output}")

    # Generate Markdown table
    md_output = "./nk167_cases.md"
    md_content = generate_markdown_table(cases)
    with open(md_output, 'w', encoding='utf-8') as f:
        f.write(md_content)
    print(f"Markdown table saved to {md_output}")

if __name__ == "__main__":
    main()
