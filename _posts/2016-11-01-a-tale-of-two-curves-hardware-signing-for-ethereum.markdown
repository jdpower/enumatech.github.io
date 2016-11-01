---
layout: post
title:  "A Tale of Two Curves - Hardware Signing for Ethereum"
date:   2016-11-01 17:38:08 +0800
categories: update
author: Lionello Lunesu
---
All popular blockchains, starting with Bitcoin through Ethereum all the way up to Zcash, use the Elliptic Curve Digital Signature Algorithm (ECDSA) for cryptographically signing transactions.
Software implementations are often prone to side-channel attacks that leak
information about the private keys. Luckily, newer devices are equipped with
hardware that supports key generation and signing, but leveraging these new
features for existing blockchains is not straightforward because of the
different algorithms involved.

# Cryptographic Signatures

A cryptographic signature proves that the sender of the transaction had access to a private key and
that the transaction has not been changed since it was signed. These ECDSA
signatures are typically calculated in the wallet app by first creating a
digest (hash) over the unsigned transaction data and then running the EC
digital signature algorithm to calculate a pair of 256-bit integers identified
by 'r' and 's'. This pair of integers is added to the transaction data to create
a signed transaction and broadcast to the blockchain network.

<pre>
000:0100000001ac18fa31f68e5597d4d1580ec1bdea10be30a39d10dddfd41360b3
020:F7bbc40fac000000006a47<span style="color:red">304402206d3e58f553c0605c3a663d6baa7258cd53</span>
040:<span style="color:red">6f3c50f4aac96c361695f82ab2017d022003ad05075cff6be0185d4dcc7581a6</span>
080:<span style="color:red">0634de35a33585f009ab2f0d1beb9ccbd8</span>01210374b22e7dd641b4d24c483023
0A0:A275fc808c813fe89f8cb4a9c97ef0f3431afb37ffffffff0202000000000000
0C0:001976a914a24d41cca0b9baba81ce4f43747d97e24846ca6088acee3dcd1d00
0E0:0000001976a91444635889ad4ba11e76c14d347867c48dba4069b388ac000000
100:00
</pre>

##### Signed Bitcoin transaction (Pay2PubKeyHash); ECDSA signature in red

<pre>
000:F86d21850ba43b7400832fefd89454450450e24286143a35686ad77a7c851ada
020:01a0880de0b6b3a764000080<span style="color:red">1ba0c36fdbf8043a64a6096ee81da4de7f04def4</span>
040:<span style="color:red">77b9a3210a18967fad07f72112b2a04aedfd1d9d9085256373b40ef02bc3da0a</span>
080:<span style="color:red">95054f40075de340086c9512707b29</span>
</pre>

##### Signed Ethereum transaction (Ether transfer); ECDSA signature in red

The miners on the network then check the
transaction details (whether you actually have money to spend, for example) and
verify the ECDSA signature to ensure that the sender, identified by a public
key, has had access to the corresponding private key. Multiple transactions are
combined into a block,
including a reference to the previous block, creating a chain of blocks.

# Protecting the Private Key

It's obvious to see that when somebody
obtains a copy of your private key, he/she can calculate valid signatures over
malicious transactions that will be accepted by the network as if they came
from you. The security of your funds or smart contracts depends on the security
of your private key(s).

There are several popular ways for securing
your private keys to ensure they cannot be copied or stolen:

* Regenerating the private key using a Key Derivation Function (KDF)
* Using a Secure Element with hardware signing

A Key Derivation Function generates a
private key from a secret value such as a password or passphrase. By
regenerating the private key each time it's needed, no key needs to be stored
and therefor no key can be copied. However, the derivation algorithm itself can
leak side-channel information that reveals the private key.[^1]

With hardware signing, the private key
resides in the hardware and cannot be retrieved. It can only be used to
calculate signatures. The private key and any temporary values calculated
during signing reside in hardware registers and are not stored in memory or
accessible from software. Of course, having unprotected access to the hardware
would allow an attacker to sign malicious transactions all the same, without
knowing the private key, so this method and KDF are often combined, with the
derivation of the key happening in hardware as well.[^2]

The latest Android and iOS devices support
hardware signing on a specifically designed hardware component called the
Secure Element. In the case of iOS, Apple has included its Secure Enclave since
the iPhone 5S. Standalone Secure Elements that support hardware signing are
also available from many vendors, including Atmel[^3], Infineon[^4], NXP[^5].

Unfortunately, neither the Android SDK nor
the iOS 9+ SDK support the elliptic curve that's used
for the popular blockchains. This is
indeed the reason why all cryptocurrency wallet apps are using
software signing. Similarly, many of the
hardware solutions mentioned earlier do not support the blockchain curve
either. This means that it's far from trivial to use hardware signing with any
of the popular blockchains. Before we can dig into this some more, let's see
what elliptic curves actually are.

# Elliptic Curves 101

*This introduction to Elliptic Curve Cryptography (ECC) is heavy on
algebra. Feel free to skip to the next section [Curve Parameters](#cp).*

An Elliptic Curve is an algebraic curve defined by the equation: ___y² = x³ + a&sdot;x + b___

![Two elliptic curves with different values for constants a and b](/images/two curves.png)

##### Two elliptic curves with different values for constants a and b

In the context of Elliptic Curve
Cryptography, a private key is simply a random positive integer, typically
identified with the letter _d_. The corresponding public key, identified by _Q_,
is actually a point on the curve with coordinates _(Qx,Qy)_. These coordinates
are calculated by taking a base point on the curve, _G_ for "Generator", and
multiplying it by the private key d. The
coordinates of the base point _(Gx,Gy)_ are also a constant and are chosen as to
generate unique values with each subsequent addition.[^6]

The term "addition" in this
context is not the same as with integers but is defined as a new operation that
takes two points on the curve and calculates a third point. Multiplication of a
point by an integer (multiplication by a scalar) is no different than applying
addition multiple times. In short, point _Q_ (the public key) is calculated by adding point
_G_ (the curve's generator) to itself d (the private key) times, _Q=G+G+G+G+G+..._ or
_Q=d&times;G_

![Redefinition of addition for a pair of points on an elliptic curve](/images/elliptic curve addition.png)

##### Redefinition of addition for a pair of points on an elliptic curve

The Elliptic Curve Digital Signature
Algorithm (ECDSA) can be summarized as follows: the signer picks a random
number k and calculates a point _C_ on the curve using _C=k&times;G_. Using this random number, together with the signer's private key d and the digest (hash) e from the message to be signed, the signer
calculates a positive integer _s=(e+r&sdot;d)/k_. The final ECDSA signature _(r,s)_ consists of _r_, the x-coordinate of C = _Cx_, and the calculated integer _s_.
Given the message, the signature, and the signer's public key, anybody can
verify that the signer has had access to the private key and that the message
is authentic. The security aspect of ECDSA stems from the fact that it's easy
to calculate a point on the curve by multiplication, but it's near-impossible
to derive the parameters that resulted to that point.

The last thing to note is that all
calculations in ECC are happening over a "finite field". What this
means is that the all the values in the calculations are limited to use values
from a finite set of numbers. In particular, for 256-bit ECC, all the
parameters are limited to be from the set of positive integers smaller than
some big number _p_, where _p_ itself must be smaller than 2<sup>256</sup>
in order to make every value fit within 256 bits of storage.

# Curve Parameters {#cp}

There are many elliptic curves, with
different parameters, that are being used for cryptographic purposes.[^7] Mostly for
historical reasons, the different blockchains have settled on a curve called **secp256k1** which has the following
parameters:

~~~
p = 0xFFFFFFFF FFFFFFFF FFFFFFFF FFFFFFFF FFFFFFFF FFFFFFFF FFFFFFFE FFFFFC2F
a = 0
b = 7
Gx = 0x79BE667E F9DCBBAC 55A06295 CE870B07 029BFCDB 2DCE28D9 59F2815B 16F81798
Gy = 0x483ADA77 26A3C465 5DA4FBFC 0E1108A8 FD17B448 A6855419 9C47D08F FB10D4B8
n = 0xFFFFFFFF FFFFFFFF FFFFFFFF FFFFFFFE BAAEDCE6 AF48A03B BFD25E8C D0364141
~~~

##### Elliptic curve domain parameters secp256k1

As mentioned before, the different hardware
solutions support multiple curves, but usually do not support secp256k1.
Instead, they include support for a curve called **secp256r1**, also known as **prime256**. This
also happens to be the only 256-bit curve that's supported by the Android SDK
hardware backed key store and iOS's Secure Enclave. The question why these
hardware solutions are using this particular curve and not the other popular
one is a source of many conspiracy theories.[^8]

~~~
p = 0xFFFFFFFF 00000001 00000000 00000000 00000000 FFFFFFFF FFFFFFFF FFFFFFFF
a = -3
b = 0x5AC635D8 AA3A93E7 B3EBBD55 769886BC 651D06B0 CC53B0F6 3BCE3C3E 27D2604B
Gx = 0x6B17D1F2 E12C4247 F8BCE6E5 63A440F2 77037D81 2DEB33A0 F4A13945 D898C296
Gy = 0x4FE342E2 FE1A7F9B 8EE7EB4A 7C0F9E16 2BCE3357 6B315ECE CBB64068 37BF51F5
n = 0xFFFFFFFF 00000000 FFFFFFFF FFFFFFFF BCE6FAAD A7179E84 F3B9CAC2 FC632551
~~~

##### Elliptic curve domain parameters secp256r1

Needless to say, it's not possible to
verify a signature calculated from one curve with an algorithm designed for
another curve. A point calculated with one set of parameters would simply not
lie on the curve represented by the other set. A public key calculated by
secp256r1 hardware would not be a valid public key for use with Bitcoin, for
example. We could still rely on the hardware backed APIs to evaluate the key
derivation function and as a source of high-quality randomness. But having to
run the signature calculation in software may expose
the private key to side channel attacks from other programs running on the same
processor, even across virtual machines.[^9]

It's worth noting that signing hardware is often
versatile and can be configured for different curves. But even when the
underlying hardware supports custom curves, the SDKs do not necessarily give 3rd
party developers access to all these functions and usually limit ECDSA to
secp256r1. This is currently the case for both Android and iOS.

# Going Meta

Simply put, there's no way to leverage the
Android or iOS hardware signing functions to directly
sign blockchain transactions. We can however sign transactions indirectly: by having a "man in the
middle" that verifies the secp256r1 hardware signature and generating a
compatible secp256k1 signature for the final transaction. "Man in the
middle" is not usually a term one likes to hear when it comes to security,
and for good reason. If the man in the middle can generate valid signatures on
my behalf, what's keeping him from generating signatures without my explicit
consent? The end-to-end security of such a setup is completely dependent on the
security of the middleman; the fact that I'm using hardware signing is not
making it any more secure.

In the case of Bitcoin or Zcash, we're out
of luck. Without dedicated secp256k1 hardware support we are stuck with signing
transactions in software.

In the case of Ethereum, however, we have
at our disposal a Turing-complete secure virtual machine. We can verify the
hardware signature in the virtual machine, no matter what signing algorithm was
used to calculate it, as long as we can code up an implementation of the
verification algorithm to run inside the Ethereum virtual machine.

Implementations of the ECDSA verification
algorithm are a dime a dozen and too many to enumerate here. In fact, there's
already a tested and open source implementation for Ethereum by Vitalik
Buterin, co-founder of Ethereum.[^10] From the constants in that code it's apparent that it was written to
verify signatures using the secp256k1 curve, as can be expected. It's
straightforward to change all the curve constants to their secp256r1
counterparts, according to the parameter lists above. Unfortunately, doing this
did not work, and it's not immediately apparent why it wouldn't. Although, the
fact that the code does not declare the constant a from the list is a solid
hint.

> Premature optimization is the root of all evil — Donald Knuth

As usual, the devil is in the details. From
the curve parameters you can see that for the secp256k1 curve the parameter _a_ is 0. This
means that the secp256k1 curve equation can be simplified as ___y² = x³ + 7___,
completely dropping the a&sdot;x term. The algorithm in the `ecc.se`
file has been optimized to exclude any multiplication that involves a. And this optimization is not unique to this
code. It just so happens that lately, most open sourced ECDSA code that's
available on the internet was written for blockchain wallets and these all have
the same or similar optimizations. Changing their constants from one curve to
the other does not work.

What is needed is an algorithm that is
generic enough to be applicable to all curves, yet still contains the usual
optimizations that make ECDSA feasible in the first place. (Imagine calculating
a public key naively by actually adding a curve point to itself ~2<sup>256</sup> times; it would simply take too
long.) Furthermore, the code must be general enough to allow for easy porting
to a language that Ethereum understands.

In the end we've settled on porting an
implementation of ECDSA written by Sébastien Martini in
2010 called wcurve.[^11] His
Python code supports both secp256r1 and secp256k1 curves and is very friendly
to porting to Solidity and Serpent: the major programming languages of Ethereum.
It would make sense to port the Python code to Serpent, since the Serpent
programming language was based on Python in the first place, but lately a lot
of the tooling around Ethereum is being built for the newer Solidity
programming language, a JavaScript lookalike. Alas, when we tried two months
ago, the Solidity compiler could not handle the ported algorithm and the
compiler consistently threw an exception on a not-implemented code path deep
within its optimizer. We were stuck with the older, less feature filled,
Serpent compiler.

Our **Wcurve** contract[^12], once
deployed, allows anyone to verify secp256r1 signatures by invoking the
contract's endpoint. Simply include the below ABI spec into your contract and
you can call it from your own code. The code doesn't (yet) support the public
key recovery that's included in the Ethereum built-in ecrecover, so the
caller will have to provide the full public key coordinates as arguments Qx and
Qy.

> secp256r1 deployed on main net at 0x1a7706D9b3D6253e8135A48c39CA01B6B470C943

The Wcurve contract ABI definition can be found below. Note that this
ABI definition can be reused for 256-bit curves other than secp256r1:

~~~ js
contract Wcurve {
    function ecverify(uint256 Qx, uint256 Qy, uint256 e, uint256 r, uint256 s) constant returns(bool);
}
~~~

##### Wcurve ABI definition for Solidity

~~~ js
contract WcurveTest
{
    Wcurve wcurve;
    function WcurveTest(address wcurveAddress) {
        wcurve = Wcurve(wcurveAddress);
    }
    function testR1(bytes32 Qx, bytes32 Qy, bytes32 r, bytes32 s) returns(bool)
    {
        bytes32 e = sha256("user should have signed this string");
        if (wcurve.ecverify(uint(Qx), uint(Qy), uint(e), uint(r), uint(s)) == false) {
            return false;
        }
        // do something useful
        return true;
    }
}
~~~

##### Using Wcurve from a Solidity contract

~~~ js
abi=[{name:"ecverify",type:"function",constant:true,inputs:[{name:"Qx",type:"uint256"},{name:"Qy",type:"uint256"},{name:"message",type:"uint256"},{name:"r",type:"uint256"},{name:"s",type:"uint256"}],outputs:[{type:"bool"}]}]
~~~

##### Wcurve ABI definition for web3

~~~ js
wcurve=eth.contract(abi).at("0x1a7706D9b3D6253e8135A48c39CA01B6B470C943")
~~~

##### Using the pre-deployed Wcurve contract with web3

~~~ js
wcurve.ecverify("0x4bd613713cd1282639f74c758d76b46dd683aec8b0fcd7018ce190725d5558c7","0x94e5582fb9d1b6bf3696fb926ee859f20f091817ebd350f6318dc25afc5afae5","0x0e177fa9a997f02c0e0d378ee12bf38034dcf2eb2ad4da30121985ee20562c14","0x97d637ec960950ebe62ba2a48c1bf8bd2a22dac8e757dfc00e13ac77667b5032","0x9191060fda370fcc773936fe759555ebd21134d97f39a617007eba8ba799586f")
~~~

##### Example web3 Wcurve invocation using a valid secp256r1 signature

# Conclusion

We encourage everyone to leverage our
Wcurve contract to add secp256r1 support to their own contracts. Hopefully this
can serve as an initial step to getting a built-in secp256r1 version of
Ethereum's ecrecover.[^13]

We welcome comments at the Wcurve GIST page[^12] or by e-mail at lionello&lt;AT&gt;enuma.io

# References

[^1]: This attack was used to retrieve the key from a Trezor hardware wallet: <http://johoe.mooo.com/trezor-power-analysis/>

[^2]: Both the Key Derivation Function and the hardware signing algorithm rely on random numbers. This is another functionality that needs to be provided by hardware. <https://en.wikipedia.org/wiki/Hardware_random_number_generator>

[^3]: Atmel ECC-based devices <http://www.atmel.com/products/security-ics/cryptoauthentication/ecc-256.aspx>

[^4]: Infineon Security controllers <http://www.infineon.com/cms/en/product/security-and-smart-card-solutions/security-controllers/channel.html?channel=5546d462503812bb015066c2d223173d>

[^5]: NXP Secure authentication microcontroller <http://www.nxp.com/products/identification-and-security/secure-authentication-and-anti-counterfeit-technology:MC_71548>

[^6]: Think of it as if you were to pick the constants for a pseudo random number generator which uses a formula like _Xn+1 = a&sdot;Xn + c_ where _Xn+1_ is the next random number calculated from the previous random number _Xn_. You'd want values of _a_ and _c_ that would return all possible values for the domain of _X_. <https://en.wikipedia.org/wiki/Linear_congruential_generator>

[^7]: From SEC 2: Recommended Elliptic Curve Domain Parameters <http://www.secg.org/SEC2-Ver-1.0.pdf>

[^8]: Ars Technica, NSA could put undetectable "trapdoors" in millions of crypto keys "Primes with certain properties allow for easier computation of discrete logarithms" <http://arstechnica.com/security/2016/10/how-the-nsa-could-put-undetectable-trapdoors-in-millions-of-crypto-keys/>

[^9]: One Bit Flips, One Cloud Flops: Cross-VM Row Hammer Attacks and Privilege Escalation <https://www.usenix.org/system/files/conference/usenixsecurity16/sec16_paper_xiao.pdf>

[^10]: Vitalik's ECC Serpent code <https://github.com/ethereum/serpent/tree/master/examples/ecc>

[^11]: Original Python wcurve project page <http://seb.dbzteam.org/wcurve/>

[^12]: wcurve.se GIST <https://gist.github.com/lionello/1e466265b802a704b58d6fdcccc42e8e>

[^13]: Miscellaneous Ethereum built-ins <http://solidity.readthedocs.io/en/develop/miscellaneous.html>
