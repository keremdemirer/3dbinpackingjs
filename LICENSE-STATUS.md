# License status and provenance

MIT is the preferred project license, but it has not been applied to the inherited
solver because permission to relicense that code has not been verified.
`package.json` remains `private: true` and
uses `license: "UNLICENSED"`; no npm publication is configured by this change.
This file records provenance and the outstanding license decision, and does not
grant a license.

The JavaScript solver credits the C implementation in
[wknechtel/3d-bin-pack](https://github.com/wknechtel/3d-bin-pack/).
At upstream commit
[`4b86e3df95af41d74dad0746d949d67f329ee424`](https://github.com/wknechtel/3d-bin-pack/tree/4b86e3df95af41d74dad0746d949d67f329ee424),
the repository tree contains no license file. Its
[README](https://github.com/wknechtel/3d-bin-pack/blob/4b86e3df95af41d74dad0746d949d67f329ee424/README.md)
describes the source as transcribed from the appendices to Erhan Baltacıoğlu's
Air Force Institute of Technology thesis. The inspected
[C source](https://github.com/wknechtel/3d-bin-pack/blob/4b86e3df95af41d74dad0746d949d67f329ee424/src/binpack.c)
does not include a license notice.

Before public package publication, the maintainer needs to clarify the applicable
permissions for the upstream code and JavaScript contributions, select and add
an appropriate project license, and review the package's publication settings.
The upstream history alone is not being treated as permission to select a
license for this port.

## Verification and proposed license

MIT was selected as the preferred license during maintenance on 2026-11-02.
The maintainer confirmed there is no separate upstream relicensing permission.
Review of the upstream repository tree, README, C source, and issue discussions
found no explicit license grant. The [AFIT thesis record](https://scholar.afit.edu/etd/4563/)
identifies the source thesis; its front matter permits public release and
unlimited distribution, but no explicit MIT or other software-relicensing grant
was found in the inspected thesis. Distribution approval is not being treated
as evidence of permission to apply MIT to this derived code.

Before adding a project-wide MIT license, obtain or identify the applicable
permission from the original code's rights holder and clarify upstream-port
contributions. Keep the existing provenance notices. No project-wide license
grant is asserted. `UNLICENSED` and npm publication protection remain in place.
