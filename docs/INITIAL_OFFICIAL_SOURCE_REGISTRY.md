# Initial official scholarship source registry proposal

**Status:** Proposed sources for owner approval and administrator registration.  
**Prepared:** 28 November 2026  
**Important:** This is a source shortlist, not a list of scholarships and not an instruction to publish records. The discovery scanner only finds candidate links on the registered source domain. It does not verify eligibility, deadlines, funding or publication status.

The owner should approve the initial source list and review cadence before these sources are registered in the development database. Use the official page URLs below as the source URLs; keep the official domain exactly as listed.

| Destination | Provider / source | Official domain | Suggested source page | Source type | Suggested check interval |
|---|---|---|---|---|---:|
| Australia | RMIT University scholarships | rmit.edu.au | https://www.rmit.edu.au/scholarships | university | 14 days |
| Australia | University of Melbourne scholarships | scholarships.unimelb.edu.au | https://scholarships.unimelb.edu.au/ | university | 14 days |
| Australia | Murdoch University scholarships | murdoch.edu.au | https://www.murdoch.edu.au/study/scholarships | university | 14 days |
| Australia | University of Queensland scholarships | scholarships.uq.edu.au | https://scholarships.uq.edu.au/ | university | 14 days |
| United Kingdom | University of Stirling scholarships | stir.ac.uk | https://www.stir.ac.uk/scholarships/ | university | 14 days |
| United Kingdom | University of Dundee scholarships | dundee.ac.uk | https://www.dundee.ac.uk/scholarships | university | 14 days |
| United Kingdom | University of Essex scholarships | essex.ac.uk | https://www.essex.ac.uk/scholarships | university | 14 days |
| United Kingdom | University of Leeds scholarships | leeds.ac.uk | https://www.leeds.ac.uk/scholarships | university | 14 days |
| United States | Wesleyan University financial aid and scholarships | wesleyan.edu | https://www.wesleyan.edu/admission/undergraduate-admission/international/ | university | 14 days |
| United States | Iowa State University international scholarships | iastate.edu | https://www.iastate.edu/admission-and-aid/admissions/international-admissions/international-merit-scholarships | university | 14 days |
| Canada | University of British Columbia awards | ubc.ca | https://you.ubc.ca/financial-planning/scholarships-awards-international-students/ | university | 14 days |
| Canada | University of Waterloo scholarships | uwaterloo.ca | https://uwaterloo.ca/future-students/financing/scholarships | university | 14 days |
| China | China Scholarship Council / Campus China | campuschina.org | https://www.campuschina.org/ | official_portal | 14 days |

## Registration notes

1. Register only sources the owner has approved.
2. The current source-registration API requires the source URL hostname to match the registered official domain. If a provider uses a separate official scholarship subdomain, register that subdomain as its own domain/source rather than pretending it is the parent domain.
3. The scanner does not follow redirects. If an official page redirects, an administrator must verify the destination and update the registered source URL manually.
4. Some scholarship pages are rendered dynamically or link to third-party application systems. A zero-candidate scan does not mean no scholarships exist.
5. A source scan can create duplicate candidates; the system suppresses duplicates using normalized URLs/fingerprints, but administrators should still inspect the queue.
6. Keep country-specific government scholarship and embassy notices separate. For example, a Chinese Government Scholarship notice issued for Botswana is not proof of eligibility or deadline for Kenya, Somalia or another country.
7. Do not use aggregator sites, agents, social media posts or scraped directories as primary verification evidence.

## Operating cadence

- Run an initial manual scan after owner approval.
- Review all candidates within 3 business days of discovery.
- Recheck active sources at least every 14 days during active scholarship seasons.
- Recheck a published scholarship directly at its official page before the stated deadline and at least every 30 days.
- Deactivate sources that repeatedly fail, change ownership or cease to be official.
- A source-page change creates a review signal only. It does not establish a change in scholarship terms.

## Publication gate

A source registration or scan must never mark a scholarship as verified. Every scholarship still needs the complete evidence-backed verification checklist and an explicit administrator publication action.
