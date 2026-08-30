import { LegalPage } from "@/components/LegalPage";
import { Fill } from "@/components/LegalFill";

export const metadata = { title: "Terms — Bounce" };

export default function TermsPage() {
  return (
    <LegalPage eyebrow="Legal" title="Terms of Service" updated="[DATE YOU PUBLISH THIS]">
        <p>
          This is a complete first draft written to cover Bounce&rsquo;s actual features and policies (see the
          bracketed fields like <Fill>Your Company Name</Fill> — fill those in with your real details). It is not a
          substitute for review by a lawyer licensed where you operate, especially given this app handles live video
          between strangers. Have it reviewed before you rely on it, but there is nothing left half-written here.
        </p>

        <h2>1. Who this is</h2>
        <p>
          Bounce is operated by <Fill>Your Company Name / Your Legal Name</Fill> (&ldquo;Bounce,&rdquo;
          &ldquo;we,&rdquo; &ldquo;us&rdquo;), located at <Fill>Your Business Address or Jurisdiction</Fill>. You can
          reach us at <Fill>support@yourdomain.com</Fill>. By using Bounce, you agree to these Terms and to our{" "}
          <a href="/privacy">Privacy Policy</a> and <a href="/community-guidelines">Community Guidelines</a>, which
          are part of this agreement.
        </p>

        <h2>2. You must be 18 or older</h2>
        <p>
          Bounce connects you with strangers over live video and text with no identity verification beyond your own
          attestation. It is not for anyone under 18, full stop. By using Bounce you confirm you are at least 18. If
          you learn that someone under 18 is using the service, or if you are a parent/guardian who believes a minor
          in your care has used it, contact us immediately at <Fill>support@yourdomain.com</Fill> so we can act on
          it.
        </p>

        <h2>3. What Bounce is</h2>
        <p>
          Bounce randomly matches you with another user for live video or text chat, optionally biased by interest
          tags, language, or gender filters you choose. You can use Bounce as a guest with no account, or create an
          optional account to keep your coin balance and history across devices. Nothing about matching is
          guaranteed — who you are matched with, how quickly, and whether a match happens at all depends on who else
          is online.
        </p>

        <h2>4. Acceptable use</h2>
        <p>You agree not to, and not to help anyone else:</p>
        <ul>
          <li>Use Bounce if you are under 18, or involve anyone who is or appears to be under 18 in any way.</li>
          <li>Broadcast, request, or engage in nudity, sexual content, or sexual solicitation.</li>
          <li>Harass, threaten, hate on, or bully another user.</li>
          <li>
            Record, screenshot, capture, or redistribute another user&rsquo;s video, audio, image, or identifying
            information without their explicit, informed consent.
          </li>
          <li>Advertise, solicit, spam, or run any commercial activity through Bounce.</li>
          <li>
            Attempt to circumvent a ban — including creating new accounts, using another person&rsquo;s device, or
            using tools to mask your device/network identity — after being banned.
          </li>
          <li>Use bots, scripts, or automation to interact with Bounce or its matching system.</li>
          <li>Probe, disrupt, or attempt to gain unauthorized access to Bounce&rsquo;s systems.</li>
          <li>Do anything illegal under the laws that apply to you.</li>
        </ul>

        <h2>5. Moderation and enforcement</h2>
        <p>
          Bounce screens video automatically and accepts reports from users. Depending on severity, your access can
          be limited on an escalating scale: a warning, then a temporary suspension (starting at one hour, increasing
          with repeat violations up to a week), up to a permanent ban. Some violations — anything involving or
          appearing to involve a minor — result in an immediate permanent ban and, where legally required, a report
          to the relevant authorities (see §11). Automated screening is not perfect, in either direction: it can miss
          things and it can flag things it shouldn&rsquo;t. If you believe you were actioned in error, contact{" "}
          <Fill>support@yourdomain.com</Fill> and we will review it.
        </p>
        <p>
          We do not record, store, or review your calls as a matter of course. Reports and automated flags are
          reviewed using short-lived technical signals (see the <a href="/privacy">Privacy Policy</a>), not stored
          video.
        </p>

        <h2>6. Accounts and guest use</h2>
        <p>
          You can use Bounce without an account; a guest identity is tied to your device. Creating an optional
          account with an email or a Google sign-in links that guest history to your account so it follows you
          across devices. You&rsquo;re responsible for anything that happens through your account or device,
          including if you let someone else use it. Tell us right away if you think your account has been
          compromised.
        </p>

        <h2>7. Coins and purchases</h2>
        <p>
          Coins are a virtual balance usable only inside Bounce, for things like unlocking match filters. Coins:
        </p>
        <ul>
          <li>Have no cash value and cannot be exchanged, transferred, gifted, or redeemed for real money.</li>
          <li>Are non-refundable once spent, except where required by law or at our discretion.</li>
          <li>May be adjusted or removed if we reasonably believe they were obtained fraudulently or through abuse.</li>
        </ul>
        <p>
          Coin pack purchases are processed by Stripe. If a purchase fails to deliver coins due to a technical error
          on our side, contact <Fill>support@yourdomain.com</Fill> with your payment confirmation and we&rsquo;ll
          make it right. Refund requests for completed, correctly-delivered purchases are handled case by case and
          are not guaranteed.
        </p>

        <h2>8. Bounce+ subscription</h2>
        <p>
          Bounce+ is a recurring monthly subscription billed through Stripe. It renews automatically each billing
          period until you cancel. You can cancel anytime; cancellation stops future renewals but does not refund the
          current billing period unless required by law. Prices may change with notice for future billing periods.
        </p>

        <h2>9. Termination</h2>
        <p>
          You can stop using Bounce at any time. We can suspend or terminate your access, guest or account, at our
          discretion — including for violating these Terms, the Community Guidelines, or applicable law — with or
          without notice. Sections of these Terms that by their nature should survive termination (ownership,
          disclaimers, liability limits, dispute resolution) do.
        </p>

        <h2>10. No warranty, limitation of liability</h2>
        <p>
          Bounce is provided &ldquo;as is&rdquo; without warranties of any kind. We do not vet who you are matched
          with, and we cannot guarantee any match will be safe, appropriate, or free of content that violates these
          Terms — that risk is inherent to a platform that connects you with strangers, and you accept it by using
          Bounce. To the maximum extent the law allows, <Fill>Your Company Name</Fill> is not liable for any
          indirect, incidental, or consequential damages arising from your use of Bounce, and our total liability for
          any claim is limited to the amount you paid us in the 12 months before the claim, or{" "}
          <Fill>a fixed amount, e.g. $50</Fill> if you paid nothing.
        </p>

        <h2>11. Reporting illegal content (CSAM)</h2>
        <p>
          If you encounter content on Bounce that sexually exploits or endangers a minor, report it immediately using
          the in-app Report button and, if you&rsquo;re in the US, you may also report directly to the{" "}
          <a href="https://report.cybertip.org" target="_blank" rel="noreferrer">
            NCMEC CyberTipline
          </a>
          . We report confirmed instances to NCMEC as required by law and permanently ban the accounts and devices
          involved.
        </p>

        <h2>12. Copyright (DMCA)</h2>
        <p>
          If you believe content on Bounce infringes your copyright, send a notice to{" "}
          <Fill>dmca@yourdomain.com</Fill> with: a description of the work, the material you believe infringes it,
          your contact information, and a statement made under penalty of perjury that the information is accurate
          and you are authorized to act.
        </p>

        <h2>13. Changes to these Terms</h2>
        <p>
          We may update these Terms as Bounce changes. We&rsquo;ll update the date at the top of this page; material
          changes will be flagged more visibly (e.g. on the homepage) before they take effect. Continuing to use
          Bounce after a change means you accept the updated Terms.
        </p>

        <h2>14. Governing law &amp; disputes</h2>
        <p>
          These Terms are governed by the laws of <Fill>Your Jurisdiction, e.g. State of Delaware, USA</Fill>,
          without regard to conflict-of-law rules. Any dispute will be resolved in the courts of{" "}
          <Fill>Your Jurisdiction</Fill>, and you consent to that jurisdiction.{" "}
          <Fill>
            Optional: add an arbitration clause here if your lawyer recommends one for a consumer app like this.
          </Fill>
        </p>

        <h2>15. Contact</h2>
        <p>
          Questions about these Terms: <Fill>support@yourdomain.com</Fill>.
        </p>
    </LegalPage>
  );
}
