import { Icon, PageHeader, Wrap } from '../components/ui'

const LINKS = [
  ['U.S. Small Business Administration', 'https://www.sba.gov', 'Federal hub for planning, funding, and managing a small business.'],
  ['SBA Learning Platform', 'https://www.sba.gov/sba-learning-platform', 'Free self-paced business courses.'],
  ['Find local SBA assistance', 'https://www.sba.gov/local-assistance', 'Locate SBA district offices and resource partners near you.'],
  ['SCORE mentoring', 'https://www.score.org', 'Free one-on-one mentoring from volunteer business experts (SBA resource partner).'],
  ["America's SBDC", 'https://americassbdc.org', 'Small Business Development Centers offer free consulting and low-cost training.'],
  ['Maryland Small Business Development Center', 'https://www.mdsbdc.umd.edu', 'Free consulting for Maryland small businesses.'],
  ["Women's Business Centers", 'https://www.sba.gov/local-assistance/resource-partners/womens-business-centers', 'SBA-funded training and counseling for women entrepreneurs.'],
  ['Veterans Business Outreach Centers', 'https://www.sba.gov/local-assistance/resource-partners/veterans-business-outreach-center-vboc-program', 'Support for veteran and military-spouse entrepreneurs.'],
  ['FTC: Cybersecurity for Small Business', 'https://www.ftc.gov/business-guidance/small-businesses/cybersecurity', 'Plain-language guidance on protecting customer data.'],
]

export default function Resources() {
  return (
    <>
      <PageHeader title="Free help for small businesses">Free advice from official programs. A local advisor can review your AI pilot plan with you.</PageHeader>
      <Wrap>
        <ul className="card divide-y divide-slate-200">
          {LINKS.map(([t, u, d]) => (
            <li key={u}>
              <a href={u} target="_blank" rel="noreferrer" className="group flex items-start justify-between gap-4 p-5 hover:bg-slate-50">
                <div>
                  <p className="font-medium text-slate-900 group-hover:text-brand-800">{t}</p>
                  <p className="text-sm text-slate-600 mt-0.5">{d}</p>
                  <p className="text-xs text-slate-500 mt-1">{u.replace('https://', '')}</p>
                </div>
                <Icon name="external" className="h-4 w-4 mt-1 shrink-0 text-slate-400 group-hover:text-brand-800" />
              </a>
            </li>
          ))}
        </ul>
      </Wrap>
    </>
  )
}
